import React, { useState, useEffect, useRef } from 'react';
import { ConnectorStatus } from './ConnectorStatus';
import { UrgentHelpModal } from './UrgentHelpModal';
import { HelpCenter } from './HelpCenter';
import { DisclaimerFooter } from './DisclaimerFooter';
import { PlanTabEnhanced } from './PlanTabEnhanced';
import { ReportsTab } from './ReportsTab';
import { JuniorPageEnhanced as JuniorPage } from './JuniorPageEnhanced';
import { ParentHubPage } from './ParentHubPage';
import { ShopPage } from './ShopPage';
import { SettingsPage } from './SettingsPage';
import { SupportPageSimple as SupportPage } from './SupportPageSimple';
import { RecordsVault } from './RecordsVault';
import { ChildProfileChip } from './ChildProfileChip';
import { InsightNavigator } from './InsightNavigator';
import { CoverageCoach } from './CoverageCoach';
import { ChildSwitcher } from './ChildSwitcher';

// AI-CENTRIC REDESIGN COMPONENTS
import { AminyWelcomeBanner } from './AminyWelcomeBanner';
import { TodaysFocusCard } from './TodaysFocusCard';
import { DashboardFocusCard } from './DashboardFocusCard';
import { ProactiveNudge } from './ProactiveNudge';
import { UpcomingSessionsStrip } from './UpcomingSessionsStrip';
import { ActionableConnectorCards } from './ActionableConnectorCards';
import { UnloadMindButton } from './UnloadMindButton';
import { StreakTracker } from './StreakTracker';
import { LiveAIVideoSheet } from './LiveAIVideoSheet';
import { MicroAffirmationBanner } from './MicroAffirmationBanner';

import { connectorHub, CONNECTOR_EVENTS } from '../lib/connector-hub';
import { useDisplayNames } from '../lib/name-store';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { 
  ChevronRight
} from 'lucide-react';

// Child profile interface for multi-child support
interface ChildProfile {
  id: string;
  name: string;
  age: number;
  conditions?: string[];
}

interface DashboardEnhancedProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onNavigateToVault?: () => void;
  onNavigateToJr?: () => void;
  onNavigateToCoach?: () => void;
  userData: {
    parentName: string;
    childName: string;
  };
  connectorData?: any;
  publishEvent?: (eventName: string, payload: any) => void;
  userTier?: string | null;
  onConnectorNavigation?: (destination: string) => void;
  userName?: string;
  childName?: string;
  carePlan?: any;
  hasSubscription?: boolean;
  canSendMessage?: boolean;
  onMessageSent?: () => void;
  onPaywallTrigger?: () => void;
  skippedOnboardingSteps?: string[];
  onNavigate?: (destination: string) => void;
  // Multi-child support
  children?: ChildProfile[];
  activeChildId?: string;
  onChildSwitch?: (childId: string) => void;
  onAddChild?: () => void;
}

interface PlanActivity {
  id: string;
  time: string;
  skillType: 'speech' | 'social' | 'sensory' | 'routines';
  title: string;
  description: string;
  timeEstimate: string;
  completed: boolean;
  progress: number;
  whyItHelps?: string;
}

export function DashboardEnhanced({ 
  activeTab = 'home',
  setActiveTab,
  onNavigateToVault,
  onNavigateToJr,
  onNavigateToCoach,
  userData,
  connectorData,
  publishEvent,
  userTier,
  onConnectorNavigation,
  userName, 
  childName, 
  carePlan, 
  hasSubscription = false,
  canSendMessage = true,
  onMessageSent,
  onPaywallTrigger,
  skippedOnboardingSteps = [],
  onNavigate,
  children: childProfiles = [],
  activeChildId,
  onChildSwitch,
  onAddChild
}: DashboardEnhancedProps) {
  const { caregiverShort, childShort } = useDisplayNames();
  
  // Safe state initialization
  const [showUrgentHelp, setShowUrgentHelp] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showLiveVideo, setShowLiveVideo] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(5);
  const [longestStreak, setLongestStreak] = useState(12);
  const [isStreakPaused, setIsStreakPaused] = useState(false);

  // Safe data extraction
  const safeUserData = userData || { parentName: 'Parent', childName: 'Child' };
  const safeChildName = safeUserData.childName || childShort || 'Child';
  const safeCaregiverName = safeUserData.parentName || caregiverShort || 'Parent';
  const safeTier = userTier || 'core';

  // Today's Plan - sample data with safe defaults
  const [todaysPlan, setTodaysPlan] = useState<PlanActivity[]>([
    {
      id: '1',
      time: 'Morning',
      skillType: 'speech',
      title: 'Practice greetings',
      description: `Say "hi" to 3 people`,
      timeEstimate: '5 min',
      completed: false,
      progress: 0,
      whyItHelps: 'Builds social connection and communication skills daily.'
    },
    {
      id: '2', 
      time: 'Afternoon',
      skillType: 'sensory',
      title: 'Sensory exploration',
      description: 'Texture bins with rice',
      timeEstimate: '10 min',
      completed: false,
      progress: 0,
      whyItHelps: 'Sensory input helps with self-regulation and focus.'
    },
    {
      id: '3',
      time: 'Evening', 
      skillType: 'routines',
      title: 'Bedtime routine',
      description: 'Consistent 3-step wind-down',
      timeEstimate: '15 min',
      completed: false,
      progress: 60,
      whyItHelps: 'Predictable routines reduce anxiety and improve sleep.'
    }
  ]);

  // State for AI-centric dashboard
  const [showProactiveNudge, setShowProactiveNudge] = useState(true);

  // Get contextual nudge based on time and usage
  const getContextualNudge = () => {
    const hour = new Date().getHours();
    
    // Evening bedtime nudge
    if (hour >= 19 && hour < 21) {
      return {
        message: "Evening's here — want to set up a calm bedtime visual schedule?",
        actionLabel: "Create schedule",
        onAction: () => {
          toast.success('Creating your bedtime schedule...');
          setShowProactiveNudge(false);
        }
      };
    }
    
    // Missing insurance card
    if (skippedOnboardingSteps?.includes('insurance')) {
      return {
        message: "When you're ready, adding your insurance card helps me support you better.",
        actionLabel: "Add card",
        onAction: () => {
          if (onNavigate) onNavigate('vault');
          setShowProactiveNudge(false);
        }
      };
    }
    
    // Morning routine suggestion
    if (hour >= 6 && hour < 9) {
      return {
        message: "Good morning — you've got this. Ready for today's calm plan?",
        actionLabel: "Start routine",
        onAction: () => {
          toast.success('Starting your morning...');
          setShowProactiveNudge(false);
        }
      };
    }
    
    return null;
  };

  // Handle Unload Mind submission
  const handleUnloadMind = (text: string, category: 'plan' | 'coach' | 'coverage') => {
    // This would integrate with the connector hub to categorize and save
    if (publishEvent) {
      publishEvent(CONNECTOR_EVENTS.INSIGHT_UPDATED, { 
        source: 'unload-mind',
        category,
        content: text 
      });
    }
  };

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeContent();
      case 'care':
        return <PlanTabEnhanced carePlan={carePlan} />;
      case 'reports':
        return <ReportsTab 
          userData={{ 
            parentName: safeCaregiverName, 
            childName: safeChildName 
          }} 
          userTier={safeTier} 
        />;
      case 'hub':
        return <ParentHubPage />;
      case 'jr':
        return <JuniorPage />;
      case 'shop':
        return <ShopPage />;
      case 'support':
        return <SupportPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return renderHomeContent();
    }
  };

  const renderHomeContent = () => {
    const contextualNudge = getContextualNudge();
    
    // Sample upcoming sessions
    const upcomingSessions = [
      {
        id: '1',
        type: 'telehealth' as const,
        title: 'BCBA Consultation',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        time: '2:00 PM',
        provider: 'Dr. Sarah Chen'
      }
    ];

    // Actionable connector cards based on skipped steps or incomplete items
    const connectorCards = [
      ...(skippedOnboardingSteps?.includes('insights') ? [{
        id: 'insights',
        type: 'insight' as const,
        title: 'Insight chat incomplete',
        description: 'Finish the quick chat to help me personalize your experience',
        status: 'incomplete' as const,
        actionLabel: 'Complete chat',
        onAction: () => {
          if (publishEvent) {
            publishEvent(CONNECTOR_EVENTS.INSIGHTS_REQUESTED, {});
          }
          toast.info('Opening insight chat...');
        }
      }] : []),
      // Vault/documents connector - encourage uploading IEPs and records
      ...(!connectorData?.vault?.hasDocuments ? [{
        id: 'vault',
        type: 'vault' as const,
        title: 'Upload documents for smarter AI',
        description: 'Add IEPs, medical records, or evaluations so I can give better guidance',
        status: 'action-needed' as const,
        actionLabel: 'Add documents',
        onAction: () => {
          if (onNavigate) onNavigate('vault');
        }
      }] : [])
    ];

    return (
      <div className="space-y-8 pb-32">
        {/* Aminy Welcome Banner - AI Chat Entry Point */}
        <AminyWelcomeBanner
          userName={safeCaregiverName}
          onStartChat={() => {
            // Open the persistent Ask Aminy FAB or navigate to chat
            if (publishEvent) {
              publishEvent(CONNECTOR_EVENTS.CHAT_OPENED, {});
            }
            toast.info('Opening Aminy chat...');
          }}
        />

        {/* Daily Micro-Affirmation Banner */}
        <MicroAffirmationBanner parentName={safeCaregiverName} />

        {/* Urgent Help Quick Action - Subtle but accessible */}
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 text-lg">⚡</span>
            <span className="text-sm text-amber-900">Need help with a meltdown or crisis right now?</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => onNavigate?.('on-demand-telehealth')}
          >
            Get Help
          </Button>
        </div>

        {/* AI-Powered Focus Card - From Unload Mind */}
        <DashboardFocusCard 
          userId={userData?.childName || 'default'}
          onComplete={() => {
            toast.success('🎉 Great job! Focus task completed!');
          }}
        />

        {/* Contextual Proactive Nudge */}
        {showProactiveNudge && contextualNudge && (
          <ProactiveNudge
            message={contextualNudge.message}
            actionLabel={contextualNudge.actionLabel}
            onAction={contextualNudge.onAction}
            onDismiss={() => setShowProactiveNudge(false)}
          />
        )}

        {/* Today's Focus - Single Primary Task */}
        <TodaysFocusCard
          primaryTask={{
            id: todaysPlan[0]?.id || '1',
            title: todaysPlan[0]?.title || 'Practice greetings',
            description: todaysPlan[0]?.description || 'Say "hi" to 3 people',
            timeEstimate: todaysPlan[0]?.timeEstimate || '5 min',
            skillType: todaysPlan[0]?.skillType || 'speech',
            priority: 1,
            whyItHelps: todaysPlan[0]?.whyItHelps,
            completed: todaysPlan[0]?.completed
          }}
          additionalTasks={todaysPlan.slice(1).map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            timeEstimate: task.timeEstimate,
            skillType: task.skillType,
            priority: 2,
            whyItHelps: task.whyItHelps,
            completed: task.completed
          }))}
          onTaskClick={(taskId) => {
            if (setActiveTab) setActiveTab('care');
            toast.success('Opening task...');
          }}
          onTaskComplete={(taskId) => {
            setTodaysPlan(prev => prev.map(task => 
              task.id === taskId ? { ...task, completed: true } : task
            ));
            toast.success('Task completed!');
          }}
        />

        {/* Upcoming Sessions Mini Calendar */}
        <UpcomingSessionsStrip
          sessions={upcomingSessions}
          onSessionClick={(sessionId) => {
            toast.info('Opening session details...');
          }}
          onViewAll={() => {
            if (setActiveTab) setActiveTab('hub');
          }}
        />

        {/* Actionable Connector Cards */}
        {connectorCards.length > 0 && (
          <ActionableConnectorCards cards={connectorCards} />
        )}

        {/* Gentle Streak Tracker - Only if active */}
        {currentStreak > 0 && (
          <StreakTracker
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            isPaused={isStreakPaused}
            onViewDetails={() => {
              if (setActiveTab) setActiveTab('reports');
            }}
          />
        )}

        {/* Unload Mind Button - Floating at bottom right */}
        <UnloadMindButton onSubmit={handleUnloadMind} />

        {/* Live AI Video Sheet */}
        {showLiveVideo && (
          <LiveAIVideoSheet
            tier={safeTier}
            onClose={() => setShowLiveVideo(false)}
            onStartSession={() => {
              toast.success('Starting Live AI Video session...');
              setShowLiveVideo(false);
            }}
          />
        )}

        {/* Urgent Help Modal */}
        {showUrgentHelp && (
          <UrgentHelpModal
            onClose={() => setShowUrgentHelp(false)}
          />
        )}

        {/* Help Center Modal */}
        {showHelpCenter && (
          <HelpCenter
            onClose={() => setShowHelpCenter(false)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Child Switcher */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-950 pb-4 mb-6 border-b border-gray-200 dark:border-slate-800">
          {/* Multi-child switcher - only show if multiple children */}
          {childProfiles.length > 0 && (
            <div className="mb-4">
              <ChildSwitcher
                children={childProfiles}
                activeChildId={activeChildId || childProfiles[0]?.id || ''}
                onSwitch={(childId) => onChildSwitch?.(childId)}
                onAddChild={() => onAddChild?.()}
              />
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-2">
            {['home', 'care', 'reports', 'hub', 'shop', 'support', 'settings'].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab && setActiveTab(tab)}
                className="capitalize whitespace-nowrap"
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Disclaimer Footer */}
        <DisclaimerFooter />
      </div>
    </div>
  );
}
