import React, { useState } from 'react';
import { 
  Home, 
  ClipboardList,
  Users,
  BarChart3, 
  Sparkles,
  MoreHorizontal,
  Lock,
  X,
  User,
  ShoppingBag,
  Settings,
  HelpCircle,
  ChevronRight,
  FolderOpen,
  Shield
} from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onNavigate: (tabId: string) => void;
  userTier?: string | null;
  navigate?: (destination: string) => void;
}

export function BottomNavigation({ activeTab, onNavigate, userTier, navigate }: BottomNavigationProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  const tabs = [
    { 
      id: 'home', 
      label: 'Today', 
      icon: Home,
      ariaLabel: 'Today - Your daily dashboard and plan',
      enabled: true
    },
    { 
      id: 'plan', 
      label: 'Plan', 
      icon: ClipboardList,
      ariaLabel: 'Plan - Living development plan',
      enabled: true
    },
    { 
      id: 'care', 
      label: 'Coach', 
      icon: Users,
      ariaLabel: 'Coach - Professional coaching sessions',
      enabled: true
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: BarChart3,
      ariaLabel: 'Reports - Progress tracking and outcomes',
      enabled: true
    },
    { 
      id: 'document-vault', 
      label: 'Vault', 
      icon: FolderOpen,
      ariaLabel: 'Vault - Your digital medical binder',
      enabled: true
    },
    { 
      id: 'more', 
      label: 'More', 
      icon: MoreHorizontal,
      ariaLabel: 'More - Additional features and settings',
      enabled: true
    }
  ];

  const moreItems = [
    {
      id: 'benefits',
      label: 'Coverage',
      icon: Shield,
      description: 'Insurance and benefits navigator'
    },
    {
      id: 'junior',
      label: 'Jr',
      icon: Sparkles,
      description: 'Kid mode activities and games'
    },
    {
      id: 'telehealth',
      label: 'Telehealth',
      icon: Users,
      description: 'Video sessions and appointments'
    },
    {
      id: 'settings',
      label: 'Privacy',
      icon: Lock,
      description: 'Privacy and data settings'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Account and preferences'
    }
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl border-t border-gray-100 dark:border-slate-700 z-50 shadow-sm"
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-lg mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isCareActive = tab.id === 'care' && window.location.pathname.startsWith('/care');
            const isMoreSubPage = tab.id === 'more' && ['benefits', 'junior', 'telehealth', 'settings', 'profile'].includes(activeTab);
            const isActive = isCareActive || activeTab === tab.id || isMoreSubPage;
            const isDisabled = !tab.enabled;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  
                  if (isDisabled) {
                    alert('🔒 Pro only - Upgrade to Pro for 30-min video sessions + 10 coach chats/month.');
                    return;
                  }
                  
                  switch (tab.id) {
                    case 'home':
                      onNavigate('home');
                      break;
                    case 'plan':
                      onNavigate('plan');
                      break;
                    case 'care':
                      onNavigate('care');
                      break;
                    case 'reports':
                      onNavigate('reports');
                      break;
                    case 'document-vault':
                      onNavigate('document-vault');
                      break;
                    case 'more':
                      setShowMoreMenu(true);
                      break;
                    default:
                      onNavigate(tab.id);
                  }
                }}
                className={`
                  flex flex-col items-center justify-center space-y-2 py-3 px-3 rounded-xl relative group transition-all duration-200
                  ${isDisabled 
                    ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed' 
                    : isActive 
                      ? 'text-accent dark:text-accent bg-accent/8' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                  }
                `}
                style={{
                  minHeight: '64px',
                  minWidth: '56px'
                }}
                aria-label={tab.ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                role="tab"
                disabled={isDisabled}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-accent dark:bg-accent rounded-full" />
                )}
                
                {/* Disabled lock icon */}
                {isDisabled && (
                  <div className="absolute top-1 right-1 z-10">
                    <Lock className="w-3 h-3 text-gray-400 dark:text-slate-600" />
                  </div>
                )}
                
                {/* Icon */}
                <Icon 
                  className={`w-6 h-6 ${isDisabled ? 'opacity-40' : 'opacity-100'} transition-all duration-200`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                
                {/* Label */}
                <span 
                  className={`text-xs font-medium ${isDisabled ? 'opacity-40' : 'opacity-100'} transition-all duration-200`}
                  style={{ fontSize: '12px' }}
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
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-slate-800 rounded-t-xl border-t border-gray-200 dark:border-slate-600">
            <div className="max-w-md mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-600">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">More</h2>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              {/* Menu Items */}
              <div className="p-4 space-y-2">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setShowMoreMenu(false);
                        onNavigate(item.id);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group"
                      aria-label={`Open ${item.label}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-slate-600 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" strokeWidth={1.5} />
                        </div>
                        
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </button>
                  );
                })}
              </div>
              
              {/* Safe area padding */}
              <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
            </div>
          </div>
        </>
      )}
    </nav>
  );
}

export default BottomNavigation;