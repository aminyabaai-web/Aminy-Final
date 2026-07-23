// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import {
  Home,
  MessageCircle,
  ClipboardList,
  TrendingUp,
  Sparkles,
  MoreHorizontal,
  Lock,
  X,
  User,
  Settings,
  ChevronRight,
  FolderOpen,
  Shield,
  Users,
  BarChart3,
  Baby,
  Heart,
  Laugh,
  Video
} from 'lucide-react';
import { toast } from 'sonner';
import { productFlags } from '../lib/feature-flags';
import { HAPTICS } from '../lib/mobile-experience-enhancer';

interface BottomNavigationProps {
  activeTab: string;
  onNavigate: (tabId: string) => void;
  userTier?: string | null;
  userRole?: 'parent' | 'provider' | 'admin';
  pilotEligible?: boolean;
  navigate?: (destination: string) => void;
}

export function BottomNavigation({ activeTab, onNavigate, userTier, userRole = 'parent', pilotEligible = false, navigate }: BottomNavigationProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Only show provider nav when B2B is explicitly enabled AND user has provider role
  const isProvider = (productFlags.b2bEnabled || pilotEligible) && (userRole === 'provider' || userRole === 'admin');

  // Role-based primary tabs
  // B2C Parents: Home, Chat (Ask Aminy), Junior (center), Care, More
  // B2B Providers (only when b2bEnabled): Dashboard, Patients, Aminy (center), Notes, More
  const tabs = isProvider ? [
    {
      id: 'home',
      label: 'Dashboard',
      icon: Home,
      ariaLabel: 'Dashboard - Your practice overview',
      enabled: true,
      isCenter: false
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Users,
      ariaLabel: 'Clients - Your caseload',
      enabled: true,
      isCenter: false
    },
    {
      id: 'ask-aminy',
      label: 'Aminy AI',
      icon: Sparkles,
      ariaLabel: 'Aminy AI - Clinical AI assistant',
      enabled: true,
      isCenter: true
    },
    {
      id: 'plan',
      label: 'Notes',
      icon: ClipboardList,
      ariaLabel: 'Notes - Clinical documentation',
      enabled: true,
      isCenter: false
    },
    {
      id: 'more',
      label: 'More',
      icon: MoreHorizontal,
      ariaLabel: 'More - Additional tools',
      enabled: true,
      isCenter: false
    }
  ] : [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      ariaLabel: 'Home - Your daily dashboard',
      enabled: true,
      isCenter: false
    },
    {
      id: 'care-plan',
      label: 'My Plan',
      icon: Heart,
      ariaLabel: 'My Plan - Goals, routines and progress',
      enabled: true,
      isCenter: false
    },
    {
      id: 'ask-aminy',
      label: 'Aminy AI',
      icon: Sparkles,
      ariaLabel: 'Aminy AI - Your AI companion',
      enabled: true,
      isCenter: true
    },
    {
      id: 'telehealth',
      label: 'Care',
      icon: Video,
      ariaLabel: 'Care - Book visits with experts',
      enabled: true,
      isCenter: false
    },
    {
      id: 'more',
      label: 'More',
      icon: MoreHorizontal,
      ariaLabel: 'More - Additional features',
      enabled: true,
      isCenter: false
    }
  ];

  // Role-based "More" menu items
  // Parents see: family-focused features (Routines, Log, Telehealth, Crisis, Settings)
  // Providers see: clinical tools (Analytics, Reports, Billing, Schedule, Settings)
  const moreItems = isProvider ? [
    {
      id: 'provider-analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Practice metrics and outcomes'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: ClipboardList,
      description: 'Clinical reports and exports'
    },
    {
      id: 'telehealth',
      label: 'Schedule',
      icon: Users,
      description: 'Session scheduling'
    },
    {
      id: 'benefits',
      label: 'Billing',
      icon: Shield,
      description: 'CPT codes and superbills'
    },
    {
      id: 'feedback',
      label: 'Feedback',
      icon: MessageCircle,
      description: 'Help us improve Aminy'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'Practice preferences'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Account settings'
    }
  ] : [
    {
      id: 'junior',
      label: 'Aminy Jr ★',
      icon: Baby,
      description: "Your child's calm corner, rewards & activities — tap to open"
    },
    {
      id: 'special-time',
      label: 'Special Time',
      icon: Laugh,
      description: '10 minutes of their world — child-led play'
    },
    {
      id: 'document-vault',
      label: 'Records',
      icon: FolderOpen,
      description: "Your child's medical binder"
    },
    {
      id: 'benefits',
      label: 'Coverage',
      icon: Shield,
      description: 'Insurance and benefits'
    },
    {
      id: 'community',
      label: 'Community',
      icon: Users,
      description: 'Connect with families'
    },
    {
      id: 'feedback',
      label: 'Feedback',
      icon: MessageCircle,
      description: 'Help us improve Aminy'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'Account and preferences'
    },
  ];

  return (
    <nav
      id="main-navigation"
      tabIndex={-1}
      className="fixed bottom-0 left-0 right-0 bg-mist dark:bg-slate-900 border-t border-[#E8E4DF] dark:border-slate-700 z-50 outline-none md:hidden"
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        overflow: 'visible',
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-lg mx-auto px-2 sm:px-4 py-1 sm:py-2">
        <div className="grid grid-cols-5 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const moreTabIds = moreItems.map(item => item.id);
            const isActive = activeTab === tab.id ||
              (tab.id === 'more' && moreTabIds.includes(activeTab));
            const isDisabled = !tab.enabled;

            // One Medical-style: elevated center AI button (sage gradient), flat for other tabs
            if (tab.isCenter) {
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (isDisabled) {
                      HAPTICS.warning();
                      toast('This feature requires Aminy Pro', {
                        description: 'Upgrade to access all features.',
                      });
                      return;
                    }
                    HAPTICS.medium();
                    onNavigate(tab.id);
                  }}
                  className="relative flex flex-col items-center justify-center group"
                  style={{ minHeight: '56px', minWidth: '48px' }}
                  aria-label={tab.ariaLabel}
                  aria-current={isActive ? 'page' : undefined}
                  role="tab"
                  disabled={isDisabled}
                >
                  {/* Elevated circular button — One Medical style */}
                  <div
                    className={`
                      flex items-center justify-center w-14 h-14 rounded-full -mt-6 shadow-lg transition-all duration-200
                      ${isActive
                        ? 'bg-gradient-to-br from-[#2A7D99] to-[#577590] scale-110'
                        : 'bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] hover:scale-105 active:scale-95'
                      }
                    `}
                  >
                    <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <span
                    className={`text-sm font-semibold mt-1 transition-colors ${
                      isActive ? 'text-[#2A7D99] dark:text-[#6B9080]' : 'text-[#5A6B7A] dark:text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (isDisabled) {
                    HAPTICS.warning();
                    toast('This feature requires Aminy Pro', {
                      description: 'Upgrade to access all features.',
                    });
                    return;
                  }

                  HAPTICS.light();
                  if (tab.id === 'more') {
                    setShowMoreMenu(true);
                  } else {
                    onNavigate(tab.id);
                  }
                }}
                className={`
                  flex flex-col items-center justify-center space-y-1 py-2 px-2 rounded-xl relative group transition-all duration-200 active:scale-[0.97]
                  ${isDisabled
                    ? 'text-gray-300 dark:text-[#5A6B7A] cursor-not-allowed'
                    : isActive
                      ? 'text-[#6B9080] dark:text-[#7BA7BC]'
                      : 'text-[#5A6B7A] hover:text-[#3A4A57] dark:text-slate-400 dark:hover:text-slate-200'
                  }
                `}
                style={{
                  minHeight: '56px',
                  minWidth: '48px'
                }}
                aria-label={tab.ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                aria-expanded={tab.id === 'more' ? showMoreMenu : undefined}
                aria-haspopup={tab.id === 'more' ? 'dialog' : undefined}
                role="tab"
                disabled={isDisabled}
              >
                {/* Active indicator — top bar with spring entrance */}
                {isActive && (
                  <div
                    className="absolute top-0 left-1/2 rounded-full"
                    style={{
                      width: 28,
                      height: 3,
                      background: 'linear-gradient(90deg, #2A7D99, #6AA9BC)',
                      transform: 'translateX(-50%)',
                      animation: 'navIndicatorIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards',
                    }}
                  />
                )}

                {/* Disabled lock icon */}
                {isDisabled && (
                  <div className="absolute top-1 right-1 z-10">
                    <Lock className="w-3 h-3 text-[#8A9BA8] dark:text-[#5A6B7A]" />
                  </div>
                )}

                {/* Icon */}
                <Icon
                  className={`w-5 h-5 ${isDisabled ? 'opacity-40' : 'opacity-100'} transition-all duration-200`}
                  strokeWidth={isActive ? 2 : 1.5}
                  style={isActive ? { animation: 'navIconPop 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards' } : undefined}
                />

                {/* Label */}
                <span
                  className={`text-sm font-medium ${isDisabled ? 'opacity-40' : 'opacity-100'} transition-all duration-200`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* More Menu Sheet */}
      {showMoreMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={() => setShowMoreMenu(false)}
            aria-hidden="true"
          />

          {/* Menu Sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-slate-800 rounded-t-2xl border-t border-[#E8E4DF] dark:border-slate-600 max-h-[70vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="more-menu-title"
          >
            <div className="max-w-md mx-auto">
              {/* Pull indicator */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-[#E8E4DF] dark:border-slate-700">
                <h2 id="more-menu-title" className="text-lg font-semibold text-[#132F43] dark:text-gray-100">More</h2>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-2 rounded-full hover:bg-[#EDF4F7] dark:hover:bg-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-[#5A6B7A] dark:text-[#8A9BA8]" />
                </button>
              </div>

              {/* Menu Items */}
              <nav className="p-4 space-y-1" role="menu" aria-label="Additional features">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isItemActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        HAPTICS.light();
                        setShowMoreMenu(false);
                        onNavigate(item.id);
                      }}
                      className={`
                        w-full flex items-center justify-between p-3 rounded-xl transition-all group min-h-[56px] active:scale-[0.98]
                        ${item.id === 'junior'
                          ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-100 dark:border-purple-800/30'
                          : isItemActive
                            ? 'bg-[#6B9080]/10 dark:bg-[#6B9080]/10'
                            : 'hover:bg-mist dark:hover:bg-slate-700'
                        }
                      `}
                      role="menuitem"
                      aria-label={`${item.label}: ${item.description}`}
                      aria-current={isItemActive ? 'page' : undefined}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center
                          ${item.id === 'junior'
                            ? 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-800 dark:to-pink-900'
                            : isItemActive
                              ? 'bg-[#6B9080]/10 dark:bg-teal-800'
                              : 'bg-[#EDF4F7] dark:bg-slate-600'
                          }
                        `}>
                          <Icon
                            className={`w-5 h-5 ${item.id === 'junior' ? 'text-purple-600 dark:text-purple-300' : isItemActive ? 'text-[#6B9080] dark:text-[#7BA7BC]' : 'text-[#5A6B7A] dark:text-gray-300'}`}
                            strokeWidth={1.5}
                          />
                        </div>

                        <div className="text-left">
                          <div className={`text-sm font-medium ${item.id === 'junior' ? 'text-purple-700 dark:text-purple-300' : isItemActive ? 'text-[#6B9080] dark:text-[#7BA7BC]' : 'text-[#132F43] dark:text-gray-100'}`}>
                            {item.label}
                          </div>
                          <div className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">{item.description}</div>
                        </div>
                      </div>

                      <ChevronRight className={`w-4 h-4 ${item.id === 'junior' ? 'text-purple-400' : isItemActive ? 'text-primary' : 'text-[#8A9BA8] dark:text-[#5A6B7A]'} group-hover:text-[#5A6B7A] dark:group-hover:text-gray-300 transition-colors`} />
                    </button>
                  );
                })}
              </nav>

              {/* Safe area padding */}
              <div style={{ height: 'max(16px, env(safe-area-inset-bottom))' }} />
            </div>
          </div>
        </>
      )}
    </nav>
  );
}

export default BottomNavigation;
