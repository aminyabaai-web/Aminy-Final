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
  BarChart3
} from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onNavigate: (tabId: string) => void;
  userTier?: string | null;
  navigate?: (destination: string) => void;
}

export function BottomNavigation({ activeTab, onNavigate, userTier, navigate }: BottomNavigationProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // One Medical inspired: 5 tabs with AI in center
  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      ariaLabel: 'Home - Your daily dashboard',
      enabled: true,
      isCenter: false
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageCircle,
      ariaLabel: 'Messages - Provider communication',
      enabled: true,
      isCenter: false
    },
    {
      id: 'ask-aminy',
      label: 'Aminy',
      icon: Sparkles,
      ariaLabel: 'Ask Aminy - Your AI companion',
      enabled: true,
      isCenter: true // Center position with prominent styling
    },
    {
      id: 'plan',
      label: 'Plan',
      icon: ClipboardList,
      ariaLabel: 'Plan - Your child\'s care plan',
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

  const moreItems = [
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      description: 'Progress tracking and outcomes'
    },
    {
      id: 'document-vault',
      label: 'Vault',
      icon: FolderOpen,
      description: 'Your digital medical binder'
    },
    {
      id: 'care',
      label: 'Coaching',
      icon: Users,
      description: 'Professional coaching sessions'
    },
    {
      id: 'telehealth',
      label: 'Telehealth',
      icon: Users,
      description: 'Video sessions and appointments'
    },
    {
      id: 'benefits',
      label: 'Coverage',
      icon: Shield,
      description: 'Insurance and benefits navigator'
    },
    {
      id: 'junior',
      label: 'Jr Mode',
      icon: Sparkles,
      description: 'Kid mode activities and games'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'Privacy and preferences'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Account settings'
    }
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl border-t border-gray-100 dark:border-slate-700 z-50 shadow-lg"
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-lg mx-auto px-2 sm:px-4 py-1 sm:py-2">
        <div className="grid grid-cols-5 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id ||
              (tab.id === 'more' && ['benefits', 'junior', 'telehealth', 'settings', 'profile', 'reports', 'document-vault', 'care'].includes(activeTab));
            const isDisabled = !tab.enabled;

            // Center AI button gets special treatment
            if (tab.isCenter) {
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  className="relative flex flex-col items-center justify-center"
                  aria-label={tab.ariaLabel}
                  aria-current={isActive ? 'page' : undefined}
                  role="tab"
                >
                  {/* Elevated center button */}
                  <div
                    className={`
                      absolute -top-5 w-14 h-14 rounded-full flex items-center justify-center
                      shadow-lg transition-all duration-200
                      ${isActive
                        ? 'bg-gradient-to-br from-teal-500 to-cyan-600 scale-105'
                        : 'bg-gradient-to-br from-teal-400 to-cyan-500 hover:scale-105'
                      }
                    `}
                  >
                    <Icon
                      className="w-6 h-6 text-white"
                      strokeWidth={2}
                    />
                  </div>
                  {/* Label below */}
                  <span
                    className={`
                      text-xs font-semibold mt-8 transition-colors
                      ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-slate-400'}
                    `}
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
                    alert('🔒 Pro only - Upgrade to Pro for this feature.');
                    return;
                  }

                  if (tab.id === 'more') {
                    setShowMoreMenu(true);
                  } else {
                    onNavigate(tab.id);
                  }
                }}
                className={`
                  flex flex-col items-center justify-center space-y-1 py-2 px-2 rounded-xl relative group transition-all duration-200
                  ${isDisabled
                    ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
                    : isActive
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }
                `}
                style={{
                  minHeight: '56px',
                  minWidth: '48px'
                }}
                aria-label={tab.ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                role="tab"
                disabled={isDisabled}
              >
                {/* Active indicator */}
                {isActive && !tab.isCenter && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-teal-500 dark:bg-teal-400 rounded-full" />
                )}

                {/* Disabled lock icon */}
                {isDisabled && (
                  <div className="absolute top-1 right-1 z-10">
                    <Lock className="w-3 h-3 text-gray-400 dark:text-slate-600" />
                  </div>
                )}

                {/* Icon */}
                <Icon
                  className={`w-5 h-5 ${isDisabled ? 'opacity-40' : 'opacity-100'} transition-all duration-200`}
                  strokeWidth={isActive ? 2 : 1.5}
                />

                {/* Label */}
                <span
                  className={`text-xs font-medium ${isDisabled ? 'opacity-40' : 'opacity-100'} transition-all duration-200`}
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
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-slate-800 rounded-t-2xl border-t border-gray-200 dark:border-slate-600 max-h-[70vh] overflow-y-auto">
            <div className="max-w-md mx-auto">
              {/* Pull indicator */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">More</h2>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="p-4 space-y-1">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isItemActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setShowMoreMenu(false);
                        onNavigate(item.id);
                      }}
                      className={`
                        w-full flex items-center justify-between p-3 rounded-xl transition-colors group min-h-[56px]
                        ${isItemActive
                          ? 'bg-teal-50 dark:bg-teal-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                        }
                      `}
                      aria-label={`Open ${item.label}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center
                          ${isItemActive
                            ? 'bg-teal-100 dark:bg-teal-800'
                            : 'bg-gray-100 dark:bg-slate-600'
                          }
                        `}>
                          <Icon
                            className={`w-5 h-5 ${isItemActive ? 'text-teal-600 dark:text-teal-300' : 'text-gray-600 dark:text-gray-300'}`}
                            strokeWidth={1.5}
                          />
                        </div>

                        <div className="text-left">
                          <div className={`text-sm font-medium ${isItemActive ? 'text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-gray-100'}`}>
                            {item.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                        </div>
                      </div>

                      <ChevronRight className={`w-4 h-4 ${isItemActive ? 'text-teal-500' : 'text-gray-400 dark:text-gray-500'} group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors`} />
                    </button>
                  );
                })}
              </div>

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
