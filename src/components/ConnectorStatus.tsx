// Aminy MVP - Connector Status Strip
// Real-time status pills showing integration between modules

import React, { useState, useEffect } from 'react';
import { CheckCircle, Smartphone, Brain, Shield, Stethoscope, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { connectorHub, CONNECTOR_EVENTS } from '../lib/connector-hub';
import { ConnectorStatus as ConnectorStatusType, ConnectorEvent, JrProfile, InsightSnapshot, CoverageCase, Referral, ConnectorCaregiver } from '../types/connector';
import { getCurrentConnectorStatus } from '../lib/seed-data';
import { Card } from './ui/card';
import { toast } from 'sonner';

/** Shape of the connectorData prop – Map-based lookups by entity ID */
interface ConnectorDataMap {
  jrProfiles?: Map<string, JrProfile & { pairedAt?: Date }>;
  insights?: Map<string, InsightSnapshot & { started?: boolean }>;
  coverage?: Map<string, CoverageCase & { benefits?: Array<{ status: string; sessionsPerYear?: number; copayAmount?: number; deductibleMet?: boolean }> }>;
  referrals?: Map<string, Referral>;
  caregivers?: Map<string, ConnectorCaregiver>;
}

/** Augment Window for Aminy-specific global flags */
interface AminyAppState {
  insight?: { snapshot?: { goals?: unknown[]; summary?: string; id?: string }; region?: Record<string, unknown> };
  devices?: unknown[];
  profile?: { devices?: unknown[]; region?: Record<string, unknown> };
  benefits?: { checklistSeeded?: boolean; toggledCount?: number; items?: Array<{ toggled?: boolean }> };
  user?: { plan?: string };
}

interface AminyWindow extends Window {
  __appState?: AminyAppState;
  benefitsChecklist?: { saved?: boolean };
  benefitsStep6Visited?: boolean;
  providerSaved?: boolean;
  directoryViewed?: boolean;
}

interface NavigateOptions {
  tab?: string;
  section?: string;
  [key: string]: unknown;
}

interface ConnectorStatusProps {
  onNavigate: (destination: string, options?: NavigateOptions) => void;
  userTier?: string | null;
  connectorData?: ConnectorDataMap;
  completionFlags?: {
    jr: boolean;
    ins: boolean;
    ben: boolean;
    care: boolean;
  };
  // Alternative interface for direct status props
  benefits?: { status: string; lastChecked: Date };
  insights?: { status: string; count: number };
  devices?: { status: string; count: number };
  providers?: { status: string; count: number };
}

export function ConnectorStatus({ 
  onNavigate, 
  userTier, 
  connectorData, 
  completionFlags,
  benefits,
  insights,
  devices,
  providers
}: ConnectorStatusProps) {
  const [status, setStatus] = useState<ConnectorStatusType>(getCurrentConnectorStatus());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [statusRefresh, setStatusRefresh] = useState(0);
  const [showCareUpsell, setShowCareUpsell] = useState(false);

  // Handle both prop interfaces - prefer direct props over connectorData
  const hasDirectProps = !!(benefits || insights || devices || providers);

  // App state access with tiny local tick for re-rendering
  const [, force] = useState(0);
  
  // Live refresh without reload
  useEffect(() => {
    const bump = () => force(x => x + 1);
    window.addEventListener('connector:changed', bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener('connector:changed', bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  // Local status resolver - derive from app data (no flags)
  const resolveStatus = () => {
    try {
      const app = (window as AminyWindow).__appState || {} as AminyAppState;
      
      // Insight: check snapshot with null-safe checks
      const snapshot = app.insight?.snapshot;
      const insightDone = !!snapshot && (Array.isArray(snapshot.goals) ? snapshot.goals.length > 0 
                                                                        : !!snapshot.summary || !!snapshot.id);
      
      // Junior: check devices array
      const devices = app.devices || app.profile?.devices || [];
      const juniorPaired = Array.isArray(devices) && devices.length > 0;
      
      // Benefits: check checklist seeded and toggle status
      const b = app.benefits || {};
      const benefitsReady = (!!b.checklistSeeded && (b.toggledCount ?? 0) > 0) ||
                           (Array.isArray(b.items) && b.items.some((i: { toggled?: boolean }) => i?.toggled));
      
      // Provider: check Pro status and region availability
      const region = app.profile?.region || app.insight?.region || {};
      const isPro = !!app.user?.plan?.toLowerCase?.().includes('pro') || localStorage.getItem('aminy:pro') === '1';
      const providerAvailable = !!region.providersAvailable;
      
      // Fallbacks: OR in localStorage/sessionStorage if present for better integration
      const lsInsight = localStorage.getItem('aminy:insightReady') === '1' || sessionStorage.getItem('aminy:insightReady') === '1';
      const lsBenefits = localStorage.getItem('aminy:benefitsReady') === '1' || sessionStorage.getItem('aminy:benefitsReady') === '1';
      const lsJunior = sessionStorage.getItem('aminy:pairReady') === '1';
      const lsPro = sessionStorage.getItem('aminy:pro') === '1';
      
      const insight = insightDone || lsInsight;
      const benefits = benefitsReady || lsBenefits;
      const junior = juniorPaired || lsJunior;
      const actualIsPro = isPro || lsPro;

      return {
        insight,
        benefits,
        junior,
        isPro: actualIsPro,
        providerAvailable
      };
    } catch (error) {
      return {
        insight: false,
        benefits: false,
        junior: false,
        isPro: false,
        providerAvailable: false
      };
    }
  };

  // Listen for sessionStorage changes to update instantly
  useEffect(() => {
    const handleStorageChange = () => {
      setStatusRefresh(prev => prev + 1);
    };

    // Listen for storage events (cross-tab changes)
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for manual sessionStorage changes in same tab
    const originalSetItem = sessionStorage.setItem;
    sessionStorage.setItem = function(key: string, value: string) {
      const result = originalSetItem.apply(this, [key, value]);
      if (key.startsWith('aminy:')) {
        handleStorageChange();
      }
      return result;
    };

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      sessionStorage.setItem = originalSetItem;
    };
  }, []);

  // Helper function to safely get status indicators
  const getStatusIndicator = (type: 'jr' | 'insight' | 'benefits' | 'providers'): string => {
    try {
      // If using direct props, use those instead of connectorData
      if (hasDirectProps) {
        switch (type) {
          case 'jr':
            if (devices?.status === 'paired') return 'bg-green-500';
            return 'bg-gray-400';
          case 'insight':
            if (insights?.status === 'done') return 'bg-green-500';
            return 'bg-gray-400';
          case 'benefits':
            if (benefits?.status === 'ready') return 'bg-green-500';
            return 'bg-gray-400';
          case 'providers':
            if (providers?.status === 'available') return 'bg-green-500';
            if (providers?.status === 'unavailable') return 'bg-purple-500';
            return 'bg-gray-400';
          default:
            return 'bg-gray-400';
        }
      }
      
      switch (type) {
        case 'jr':
          const jrProfile = connectorData?.jrProfiles?.get('child-1');
          if (jrProfile?.pairedAt) return 'bg-green-500';
          if (jrProfile && !jrProfile.pairedAt) return 'bg-purple-500';
          return 'bg-gray-400';
        
        case 'insight':
          const insight = connectorData?.insights?.get('child-1');
          if (insight?.confidence) return 'bg-green-500';
          if (insight?.started && !insight?.confidence) return 'bg-purple-500';
          return 'bg-gray-400';
        
        case 'benefits':
          const coverage = connectorData?.coverage?.get('child-1');
          const hasChecklist = typeof window !== 'undefined' && (window as AminyWindow).benefitsChecklist?.saved;
          const hasCoveredBenefits = coverage?.benefits?.some?.((b: { status: string }) => b?.status === 'covered');
          const benefitsStep6Visited = typeof window !== 'undefined' && (window as AminyWindow).benefitsStep6Visited;

          if (hasCoveredBenefits || hasChecklist) return 'bg-green-500';
          if (benefitsStep6Visited && !hasCoveredBenefits && !hasChecklist) return 'bg-purple-500';
          return 'bg-gray-400';

        case 'providers':
          const referrals = Array.from(connectorData?.referrals?.values() || []);
          const hasSentReferral = referrals.some((r: Referral) => r?.status === 'sent');
          const hasProviderSaved = typeof window !== 'undefined' && (window as AminyWindow).providerSaved;
          const directoryViewed = typeof window !== 'undefined' && (window as AminyWindow).directoryViewed;
          
          if (hasSentReferral || hasProviderSaved) return 'bg-green-500';
          if (directoryViewed && !hasSentReferral) return 'bg-purple-500';
          return 'bg-gray-400';
        
        default:
          return 'bg-gray-400';
      }
    } catch (error) {
      return 'bg-gray-400';
    }
  };

  // Helper function to determine provider directory status
  const getProviderDirectoryStatus = (): boolean => {
    try {
      // Check if there are any referrals or providers available for the caregiver's state
      const caregiver = connectorData?.caregivers?.get('caregiver-1');
      const caregiverState = caregiver?.state || 'California'; // Default to California for demo
      
      // Mock provider availability by state - in real app this would come from API
      const providersByState: Record<string, number> = {
        'California': 12,
        'Texas': 8,
        'New York': 15,
        'Florida': 6,
        'Illinois': 9,
        'Pennsylvania': 4,
        'Ohio': 7,
        'Georgia': 5,
        'North Carolina': 3,
        'Michigan': 8,
        // Add more states as needed
      };
      
      const providerCount = providersByState[caregiverState] || 0;
      
      // Check if user has sent referrals or saved providers
      const referrals = Array.from(connectorData?.referrals?.values() || []);
      const hasSentReferral = referrals.some((r: Referral) => r?.status === 'sent');
      const hasProviderSaved = typeof window !== 'undefined' && (window as AminyWindow).providerSaved;

      // Return true (green) if there are providers available (≥1) OR user has engaged
      return providerCount >= 1 || hasSentReferral || !!hasProviderSaved;
    } catch (error) {
      return false; // Default to false (purple) if there's an error
    }
  };

  // Helper function to determine insight status (for pending state)
  const getInsightStatus = (): 'done' | 'pending' | 'not-started' => {
    try {
      const insight = connectorData?.insights?.get('child-1');
      if (insight?.confidence) return 'done';
      if (insight?.started && !insight?.confidence) return 'pending';
      return 'not-started';
    } catch (error) {
      return 'not-started';
    }
  };

  // Helper function to determine benefits status (for pending state)
  const getBenefitsStatus = (): 'ready' | 'pending' | 'not-started' => {
    try {
      const coverage = connectorData?.coverage?.get('child-1');
      const hasChecklist = typeof window !== 'undefined' && (window as AminyWindow).benefitsChecklist?.saved;
      const hasCoveredBenefits = coverage?.benefits?.some?.((b: { status: string }) => b?.status === 'covered');
      const benefitsStep6Visited = typeof window !== 'undefined' && (window as AminyWindow).benefitsStep6Visited;
      
      if (hasCoveredBenefits || hasChecklist) return 'ready';
      if (benefitsStep6Visited && !hasCoveredBenefits && !hasChecklist) return 'pending';
      return 'not-started';
    } catch (error) {
      return 'not-started';
    }
  };

  useEffect(() => {
    // Subscribe to relevant events that update connector status
    const unsubscribers = [
      connectorHub.subscribe(CONNECTOR_EVENTS.DEVICE_PAIRED, () => {
        setStatus(prev => ({
          ...prev,
          device: { paired: true, deviceName: 'Eddie\'s iPad', lastSeen: new Date() }
        }));
        setLastUpdate(new Date());
      }),

      connectorHub.subscribe(CONNECTOR_EVENTS.INSIGHT_UPDATED, (event: ConnectorEvent) => {
        const payload = event.payload as { confidence: number };
        setStatus(prev => ({
          ...prev,
          insight: {
            completed: true,
            confidence: payload.confidence,
            lastUpdated: new Date()
          }
        }));
        setLastUpdate(new Date());
      }),

      connectorHub.subscribe(CONNECTOR_EVENTS.COVERAGE_UPDATED, (event: ConnectorEvent) => {
        const payload = event.payload as { eligible: boolean; status: string };
        setStatus(prev => ({
          ...prev,
          benefits: {
            eligible: payload.eligible,
            status: payload.status,
            checkedAt: new Date()
          },
          providers: {
            available: payload.eligible,
            count: payload.eligible ? 12 : 0
          }
        }));
        setLastUpdate(new Date());
      }),

      connectorHub.subscribe(CONNECTOR_EVENTS.JR_SESSION_COMPLETED, () => {
        setLastUpdate(new Date());
      }),

      connectorHub.subscribe(CONNECTOR_EVENTS.PARENT_CHECKIN_LOGGED, () => {
        setLastUpdate(new Date());
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const handlePillClick = (destination: string, requiresPro: boolean = false) => {
    if (requiresPro && userTier !== 'pro') {
      // Show upgrade notification for Pro features
      toast('This feature requires Aminy Pro', {
        description: 'Upgrade to access Provider Directory and Care coordination.',
      });
      return;
    }
    onNavigate(destination);
  };

  const getDevicePill = () => {
    if (completionFlags?.jr) {
      return (
        <button
          onClick={() => handlePillClick('profile')} // Navigate to device management
          className="connector-pill connector-pill-success"
          aria-label="Aminy Ease device paired successfully"
        >
          <div className="flex items-center gap-2">
            <div className="connector-icon connector-icon-success">
              <CheckCircle size={14} strokeWidth={2.5} />
            </div>
            <div className="connector-content">
              <span className="connector-label">Aminy Ease Device</span>
              <span className="connector-sublabel">Paired ✓</span>
            </div>
          </div>
          <ChevronRight size={12} className="connector-arrow" />
        </button>
      );
    }

    return (
      <button
        onClick={() => handlePillClick('pairing')}
        className="connector-pill connector-pill-pending"
        aria-label="Pair Aminy Ease device to get started"
      >
        <div className="flex items-center gap-2">
          <div className="connector-icon connector-icon-pending">
            <Smartphone size={14} strokeWidth={2} />
          </div>
          <div className="connector-content">
            <span className="connector-label">Aminy Ease Device</span>
            <span className="connector-sublabel">Pair Aminy Ease device</span>
          </div>
        </div>
        <ChevronRight size={12} className="connector-arrow" />
      </button>
    );
  };

  const getInsightPill = () => {
    if (completionFlags?.ins) {
      return (
        <button
          onClick={() => handlePillClick('insight')}
          className="connector-pill connector-pill-success"
          aria-label={`Insight completed with ${status.insight.confidence}% confidence`}
        >
          <div className="flex items-center gap-2">
            <div className="connector-icon connector-icon-success">
              <CheckCircle size={14} strokeWidth={2.5} />
            </div>
            <div className="connector-content">
              <span className="connector-label">Insight</span>
              <span className="connector-sublabel">Done ✓</span>
            </div>
          </div>
          <ChevronRight size={12} className="connector-arrow" />
        </button>
      );
    }

    return (
      <button
        onClick={() => handlePillClick('insight')}
        className="connector-pill connector-pill-pending"
        aria-label="Start Insight Navigator to build understanding"
      >
        <div className="flex items-center gap-2">
          <div className="connector-icon connector-icon-pending">
            <Brain size={14} strokeWidth={2} />
          </div>
          <div className="connector-content">
            <span className="connector-label">Insight</span>
            <span className="connector-sublabel">Start Insight</span>
          </div>
        </div>
        <ChevronRight size={12} className="connector-arrow" />
      </button>
    );
  };

  const getBenefitsPill = () => {
    if (completionFlags?.ben) {
      return (
        <button
          onClick={() => handlePillClick('coverage')}
          className="connector-pill connector-pill-success"
          aria-label="Benefits eligibility confirmed"
        >
          <div className="flex items-center gap-2">
            <div className="connector-icon connector-icon-success">
              <CheckCircle size={14} strokeWidth={2.5} />
            </div>
            <div className="connector-content">
              <span className="connector-label">Benefits</span>
              <span className="connector-sublabel">Eligible ✓</span>
            </div>
          </div>
          <ChevronRight size={12} className="connector-arrow" />
        </button>
      );
    }

    return (
      <button
        onClick={() => handlePillClick('coverage')}
        className="connector-pill connector-pill-pending"
        aria-label="Check insurance coverage and benefits"
      >
        <div className="flex items-center gap-2">
          <div className="connector-icon connector-icon-pending">
            <Shield size={14} strokeWidth={2} />
          </div>
          <div className="connector-content">
            <span className="connector-label">Benefits</span>
            <span className="connector-sublabel">Check coverage</span>
          </div>
        </div>
        <ChevronRight size={12} className="connector-arrow" />
      </button>
    );
  };

  const getProvidersPill = () => {
    if (!status.benefits.eligible) {
      return null; // Only show if telehealth eligible
    }

    return (
      <button
        onClick={() => handlePillClick('directory', true)} // Requires Pro
        className="connector-pill connector-pill-action"
        aria-label={`Find care providers - ${status.providers.count} available`}
      >
        <div className="flex items-center gap-2">
          <div className="connector-icon connector-icon-action">
            <Stethoscope size={14} strokeWidth={2} />
          </div>
          <div className="connector-content">
            <span className="connector-label">Providers</span>
            <span className="connector-sublabel">Find care</span>
          </div>
        </div>
        <ChevronRight size={12} className="connector-arrow" />
      </button>
    );
  };

  // Status functions using new app data derivation
  const getDevicePairingStatus = (): 'paired' | 'not-paired' => {
    const resolved = resolveStatus();
    return resolved.junior ? 'paired' : 'not-paired';
  };

  const getInsightCompletionStatus = (): 'done' | 'incomplete' => {
    const resolved = resolveStatus();
    return resolved.insight ? 'done' : 'incomplete';
  };

  const getBenefitsReadinessStatus = (): 'ready' | 'pending' => {
    const resolved = resolveStatus();
    return resolved.benefits ? 'ready' : 'pending';
  };

  const getProviderAvailabilityStatus = (): 'available' | 'not-available' | 'coming-soon' => {
    const resolved = resolveStatus();
    if (!resolved.isPro) return 'not-available';
    if (resolved.isPro && !resolved.providerAvailable) return 'coming-soon';
    if (resolved.isPro && resolved.providerAvailable) return 'available';
    return 'not-available';
  };

  // Compute statuses at the top level for hooks
  const resolved = resolveStatus();
  const juniorDone = resolved.junior;
  const insightDone = resolved.insight;
  const benefitsReady = resolved.benefits;
  const isPro = resolved.isPro;

  // Visibility rules: hide card when all required steps complete for non-Pro users
  const allRequiredComplete = juniorDone && insightDone && benefitsReady;
  const shouldHideConnector = !isPro && allRequiredComplete;

  // Analytics: connector visibility tracking (moved to top level)
  useEffect(() => {
    // Visibility state tracked for analytics
  }, [shouldHideConnector, juniorDone, insightDone, benefitsReady, isPro]);

  // Live updates event listeners (moved to top level)
  useEffect(() => {
    const handleConnectorChange = () => {
      // Force re-render when connector status changes
      setStatusRefresh(prev => prev + 1);
    };

    // Listen for connector changes
    window.addEventListener("connector:changed", handleConnectorChange);

    // Listen for specific flag changes
    const flagKeys = ["aminy:paired", "aminy:insight", "aminy:benefits", "aminy:pro"];
    const handleStorageChange = (e: StorageEvent) => {
      if (flagKeys.includes(e.key || '')) {
        handleConnectorChange();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Custom event listeners for flag updates
    flagKeys.forEach(key => {
      window.addEventListener(key, handleConnectorChange);
    });

    return () => {
      window.removeEventListener("connector:changed", handleConnectorChange);
      window.removeEventListener("storage", handleStorageChange);
      flagKeys.forEach(key => {
        window.removeEventListener(key, handleConnectorChange);
      });
    };
  }, []);

  // Early return if connector should be hidden
  if (shouldHideConnector) {
    return null;
  }

  try {
    return (
      <Card className="aminy-card">
        {(() => {
          // Show full connector (visibility controlled above)
          return (
            <div 
              className="p-3" 
              style={{ borderRadius: '12px' }}
              aria-hidden="false"
            >
          {/* Card Header */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-primary">Connector</h2>
            <span className="text-xs text-muted-foreground">Updated now</span>
          </div>
          
          {/* Subtitle */}
          <div className="mb-3">
            <p className="text-sm text-muted-foreground">Set up & keep things in sync.</p>
          </div>

          {/* 4 Stacked Large List Rows */}
          <div className="space-y-3">
            
            {/* Row 1: Aminy Ease device */}
            <button
              role="button"
              tabIndex={0}
              aria-label="Open devices"
              onClick={() => {
                try {
                  const resolved = resolveStatus();
                  if (resolved.junior) {
                    onNavigate('profile/devices');
                  } else {
                    onNavigate('junior/setup');
                  }
                } catch (error) {
                  onNavigate('junior/setup');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  try {
                    const resolved = resolveStatus();
                    if (resolved.junior) {
                      onNavigate('profile/devices');
                    } else {
                      onNavigate('junior/setup');
                    }
                  } catch (error) {
                    onNavigate('junior/setup');
                  }
                }
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 text-left"
              style={{ 
                minHeight: '68px',
                pointerEvents: 'auto',
                ...(getDevicePairingStatus() === 'paired' 
                  ? { 
                      backgroundColor: 'rgba(34, 197, 94, 0.04)',
                      borderColor: 'rgba(34, 197, 94, 0.2)',
                      borderLeft: '4px solid rgba(34, 197, 94, 0.1)'
                    }
                  : { 
                      backgroundColor: 'rgb(249, 250, 251)',
                      borderColor: 'rgb(229, 231, 235)'
                    })
              }}
              title="Pair a device or start kid mode"
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-lg flex-shrink-0">
                <Smartphone size={20} className="text-current" />
              </div>
              <div className="flex-1 min-w-0">
                <div 
                  className="font-semibold text-primary text-sm leading-relaxed"
                  style={{ 
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordWrap: 'break-word',
                    hyphens: 'auto'
                  }}
                >
                  Aminy Ease device
                </div>
              </div>
              <div className="flex-shrink-0">
                <span 
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{
                    fontSize: '12px',
                    lineHeight: '16px',
                    ...(getDevicePairingStatus() === 'paired'
                      ? { 
                          backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                          color: 'rgb(22, 163, 74)' 
                        }
                      : { 
                          backgroundColor: 'transparent',
                          color: 'rgb(107, 114, 128)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        })
                  }}
                >
                  {getDevicePairingStatus() === 'paired' && 'Paired'}
                  {getDevicePairingStatus() === 'not-paired' && (
                    <>
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      Not paired
                    </>
                  )}
                </span>
              </div>
            </button>

            {/* Row 2: Insight */}
            <button
              role="button"
              tabIndex={0}
              aria-label="Open Insight"
              onClick={() => {
                try {
                  const resolved = resolveStatus();
                  if (resolved.insight) {
                    onNavigate('insight/snapshot');
                  } else {
                    onNavigate('onboarding/step-5');
                  }
                } catch (error) {
                  onNavigate('onboarding/step-5');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  try {
                    const resolved = resolveStatus();
                    if (resolved.insight) {
                      onNavigate('insight/snapshot');
                    } else {
                      onNavigate('onboarding/step-5');
                    }
                  } catch (error) {
                    onNavigate('onboarding/step-5');
                  }
                }
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 text-left"
              style={{ 
                minHeight: '68px',
                pointerEvents: 'auto',
                ...(getInsightCompletionStatus() === 'done' 
                  ? { 
                      backgroundColor: 'rgba(34, 197, 94, 0.04)',
                      borderColor: 'rgba(34, 197, 94, 0.2)',
                      borderLeft: '4px solid rgba(34, 197, 94, 0.1)'
                    }
                  : { 
                      backgroundColor: 'rgb(249, 250, 251)',
                      borderColor: 'rgb(229, 231, 235)'
                    })
              }}
              title="View snapshot or finish questions"
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-lg flex-shrink-0">
                <Brain size={20} className="text-current" />
              </div>
              <div className="flex-1 min-w-0">
                <div 
                  className="font-semibold text-primary text-sm leading-relaxed"
                  style={{ 
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordWrap: 'break-word',
                    hyphens: 'auto'
                  }}
                >
                  Insight
                </div>
              </div>
              <div className="flex-shrink-0">
                <span 
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{
                    fontSize: '12px',
                    lineHeight: '16px',
                    ...(getInsightCompletionStatus() === 'done'
                      ? { 
                          backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                          color: 'rgb(22, 163, 74)' 
                        }
                      : { 
                          backgroundColor: 'transparent',
                          color: 'rgb(107, 114, 128)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        })
                  }}
                >
                  {getInsightCompletionStatus() === 'done' && 'Done'}
                  {getInsightCompletionStatus() === 'incomplete' && (
                    <>
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      Incomplete
                    </>
                  )}
                </span>
              </div>
            </button>

            {/* Row 3: Benefits */}
            <button
              role="button"
              tabIndex={0}
              aria-label="Open Benefits"
              onClick={() => {
                try {
                  onNavigate('onboarding/step-6');
                } catch (error) {
                  onNavigate('onboarding/step-6');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  try {
                    onNavigate('onboarding/step-6');
                  } catch (error) {
                    onNavigate('onboarding/step-6');
                  }
                }
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 text-left"
              style={{ 
                minHeight: '68px',
                pointerEvents: 'auto',
                ...(getBenefitsReadinessStatus() === 'ready' 
                  ? { 
                      backgroundColor: 'rgba(34, 197, 94, 0.04)',
                      borderColor: 'rgba(34, 197, 94, 0.2)',
                      borderLeft: '4px solid rgba(34, 197, 94, 0.1)'
                    }
                  : { 
                      backgroundColor: 'rgb(249, 250, 251)',
                      borderColor: 'rgb(229, 231, 235)'
                    })
              }}
              title="Checklist & letters"
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-lg flex-shrink-0">
                <Shield size={20} className="text-current" />
              </div>
              <div className="flex-1 min-w-0">
                <div 
                  className="font-semibold text-primary text-sm leading-relaxed"
                  style={{ 
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordWrap: 'break-word',
                    hyphens: 'auto'
                  }}
                >
                  Benefits
                </div>
              </div>
              <div className="flex-shrink-0">
                <span 
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{
                    fontSize: '12px',
                    lineHeight: '16px',
                    ...(getBenefitsReadinessStatus() === 'ready'
                      ? { 
                          backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                          color: 'rgb(22, 163, 74)' 
                        }
                      : { 
                          backgroundColor: 'transparent',
                          color: 'rgb(107, 114, 128)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        })
                  }}
                >
                  {getBenefitsReadinessStatus() === 'ready' && 'Ready'}
                  {getBenefitsReadinessStatus() === 'pending' && (
                    <>
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      Pending
                    </>
                  )}
                </span>
              </div>
            </button>

            {/* Row 4: Aminy Care */}
            <button
              role="button"
              tabIndex={0}
              aria-label="Open Aminy Care"
              onClick={() => {
                try {
                  const resolved = resolveStatus();
                  
                  // Analytics
                  
                  if (!resolved.isPro) {
                    // Show Pro upsell for non-Pro users - navigate to /care with upsell
                    onNavigate('care', { returnTo: 'home', source: 'connector' }); // Pass state for return navigation
                  } else if (resolved.providerAvailable) {
                    // Pro user with care available
                    onNavigate('care', { returnTo: 'home', source: 'connector' });
                    // Emit success event
                    window.dispatchEvent(new CustomEvent("connector:changed", { detail: { tile: "care" } }));
                  } else {
                    // Pro user but care not yet available in their area
                    onNavigate('care', { returnTo: 'home', source: 'connector' }); // Still navigate to care - will show "Not available" for Pro users
                  }
                } catch (error) {
                  onNavigate('care', { returnTo: 'home', source: 'connector' }); // Fallback navigation
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  try {
                    const resolved = resolveStatus();
                    
                    // Analytics
                    
                    if (!resolved.isPro) {
                      // Show Pro upsell for non-Pro users - navigate to /care with upsell
                      onNavigate('care', { returnTo: 'home', source: 'connector' }); // Pass state for return navigation
                    } else if (resolved.providerAvailable) {
                      // Pro user with care available
                      onNavigate('care', { returnTo: 'home', source: 'connector' });
                      // Emit success event
                      window.dispatchEvent(new CustomEvent("connector:changed", { detail: { tile: "care" } }));
                    } else {
                      // Pro user but care not yet available in their area
                      onNavigate('care', { returnTo: 'home', source: 'connector' }); // Still navigate to care - will show "Not available" for Pro users
                    }
                  } catch (error) {
                    onNavigate('care', { returnTo: 'home', source: 'connector' }); // Fallback navigation
                  }
                }
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 text-left"
              style={{ 
                minHeight: '68px',
                pointerEvents: 'auto',
                ...((() => {
                  const resolved = resolveStatus();
                  const isAvailable = resolved.isPro && resolved.providerAvailable;
                  return isAvailable
                    ? { 
                        backgroundColor: 'rgba(34, 197, 94, 0.04)',
                        borderColor: 'rgba(34, 197, 94, 0.2)',
                        borderLeft: '4px solid rgba(34, 197, 94, 0.1)'
                      }
                    : { 
                        backgroundColor: 'rgb(249, 250, 251)',
                        borderColor: 'rgb(229, 231, 235)'
                      };
                })())
              }}
              title="Finish here and we'll bring you back to Home"
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-lg flex-shrink-0">
                <Stethoscope size={20} className="text-current" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="font-semibold text-primary text-sm leading-relaxed"
                    style={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordWrap: 'break-word',
                      hyphens: 'auto'
                    }}
                  >
                    Aminy Care
                  </div>
                  {(() => {
                    const resolved = resolveStatus();
                    return !resolved.isPro ? (
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: 'rgba(139, 92, 246, 0.1)',
                          color: 'rgb(124, 58, 237)',
                          fontSize: '10px',
                          lineHeight: '12px'
                        }}
                      >
                        Pro
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
              <div className="flex-shrink-0">
                <span 
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{
                    fontSize: '12px',
                    lineHeight: '16px',
                    ...((() => {
                      const resolved = resolveStatus();
                      if (!resolved.isPro) {
                        return {
                          backgroundColor: 'transparent',
                          color: 'rgb(107, 114, 128)'
                        };
                      } else if (resolved.providerAvailable) {
                        return {
                          backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                          color: 'rgb(22, 163, 74)'
                        };
                      } else {
                        return {
                          backgroundColor: 'transparent',
                          color: 'rgb(107, 114, 128)'
                        };
                      }
                    })())
                  }}
                >
                  {(() => {
                    const resolved = resolveStatus();
                    if (!resolved.isPro) {
                      return 'Pro only';
                    } else if (resolved.providerAvailable) {
                      return 'Available';
                    } else {
                      return 'Coming soon';
                    }
                  })()}
                </span>
              </div>
            </button>

          </div>
        </div>
          );
        })()}

        {/* Care Upsell Bottom Sheet */}
        {showCareUpsell && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCareUpsell(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowCareUpsell(false);
              }
            }}
            tabIndex={-1}
          >
            <div 
              className="bg-white rounded-t-2xl w-full max-w-md mx-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="care-upsell-title"
            >
              <div className="p-4 sm:p-5 md:p-6">
                {/* Header */}
                <div className="text-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Stethoscope className="w-6 h-6 text-accent" />
                  </div>
                  <h2 id="care-upsell-title" className="text-lg sm:text-xl font-semibold text-primary mb-2">
                    Care is a Pro feature
                  </h2>
                </div>

                {/* Benefits List */}
                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm text-foreground">Message coaches</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm text-foreground">Book sessions</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm text-foreground">Provider-ready packets</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Primary Button */}
                  <button
                    onClick={() => {
                      setShowCareUpsell(false);
                      onNavigate('ProPaywall');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowCareUpsell(false);
                        onNavigate('ProPaywall');
                      }
                    }}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    autoFocus
                  >
                    Start free trial
                  </button>

                  {/* Secondary Button */}
                  <button
                    onClick={() => {
                      setShowCareUpsell(false);
                      onNavigate('ProOverlay');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowCareUpsell(false);
                        onNavigate('ProOverlay');
                      }
                    }}
                    className="w-full border border-border hover:bg-muted text-foreground font-medium py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                  >
                    See what's included
                  </button>

                  {/* Tertiary Button */}
                  <button
                    onClick={() => setShowCareUpsell(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowCareUpsell(false);
                      }
                    }}
                    className="w-full text-muted-foreground hover:text-foreground font-medium py-3 px-6 rounded-xl transition-all duration-200 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  } catch (error) {
    // Error rendering ConnectorStatus - show fallback UI
    
    // Fallback UI
    return (
      <div className="connector-status-container">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-primary">Connector</span>
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {/* Fallback pills */}
          {['Jr Device', 'Insight', 'Benefits', 'Find Care'].map((label) => (
            <button
              key={label}
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 p-2 rounded-lg border transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 min-h-[48px]"
              style={{ minWidth: 0 }}
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {label}
                </div>
              </div>
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-400" />
            </button>
          ))}
        </div>
        
        <p className="connector-help-text">
          Loading connector status...
        </p>
      </div>
    );
  }
}

// Helper function for time formatting
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// CSS classes for styling (to be added to globals.css)
export const connectorStatusStyles = `
/* CONNECTOR STATUS STRIP STYLING */

.connector-status-container {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 1rem;
  padding: 16px;
  margin-bottom: 20px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 1px 3px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.connector-pills-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

@media (min-width: 480px) {
  .connector-pills-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
}

.connector-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 0.75rem;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  cursor: pointer;
  border: 1px solid transparent;
  min-height: 60px;
  position: relative;
  overflow: hidden;
}

.connector-pill-success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(22, 163, 74, 0.05) 100%);
  border-color: rgba(34, 197, 94, 0.2);
  color: rgb(22, 163, 74);
}

.connector-pill-pending {
  background: linear-gradient(135deg, rgba(8, 145, 178, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%);
  border-color: rgba(8, 145, 178, 0.2);
  color: var(--accent);
}

.connector-pill-action {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(124, 58, 237, 0.05) 100%);
  border-color: rgba(139, 92, 246, 0.2);
  color: rgb(124, 58, 237);
}

.connector-pill:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.connector-pill:active {
  transform: translateY(0) scale(0.98);
  transition: all 0.1s ease;
}

.connector-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.connector-label {
  font-weight: 600;
  font-size: 12px;
  line-height: 1.2;
}

.connector-sublabel {
  font-weight: 400;
  font-size: 10px;
  opacity: 0.8;
  line-height: 1.2;
}

.connector-icon {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.connector-icon-success {
  background: rgba(34, 197, 94, 0.15);
  color: rgb(22, 163, 74);
}

.connector-icon-pending {
  background: rgba(8, 145, 178, 0.15);
  color: var(--accent);
}

.connector-icon-action {
  background: rgba(139, 92, 246, 0.15);
  color: rgb(124, 58, 237);
}

.connector-arrow {
  color: currentColor;
  opacity: 0.6;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.connector-pill:hover .connector-arrow {
  opacity: 1;
  transform: translateX(2px);
}

.connector-help-text {
  font-size: 11px;
  color: var(--muted-foreground);
  text-align: center;
  margin: 0;
  opacity: 0.8;
  line-height: 1.4;
}

/* Mobile responsiveness */
@media (max-width: 480px) {
  .connector-status-container {
    padding: 14px;
    margin-bottom: 18px;
  }
  
  .connector-pills-grid {
    gap: 6px;
    grid-template-columns: 1fr 1fr;
  }
  
  .connector-pill {
    padding: 8px 10px;
    min-height: 56px;
  }
  
  .connector-label {
    font-size: 11px;
  }
  
  .connector-sublabel {
    font-size: 9px;
  }
  
  .connector-icon {
    width: 18px;
    height: 18px;
  }
  
  .connector-help-text {
    font-size: 10px;
  }
}

/* Small mobile screens */
@media (max-width: 380px) {
  .connector-pills-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  
  .connector-pill {
    min-height: 52px;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .connector-status-container {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.9) 100%);
    border-color: rgba(71, 85, 105, 0.3);
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.3),
      0 1px 3px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  
  .connector-pill-success {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(22, 163, 74, 0.08) 100%);
    border-color: rgba(34, 197, 94, 0.3);
    color: rgb(74, 222, 128);
  }
  
  .connector-pill-pending {
    background: linear-gradient(135deg, rgba(8, 145, 178, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%);
    border-color: rgba(8, 145, 178, 0.3);
    color: rgb(34, 211, 238);
  }
  
  .connector-pill-action {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(124, 58, 237, 0.08) 100%);
    border-color: rgba(139, 92, 246, 0.3);
    color: rgb(167, 139, 250);
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .connector-status-container {
    background: var(--background) !important;
    border: 2px solid var(--foreground) !important;
    box-shadow: none !important;
  }
  
  .connector-pill {
    background: var(--background) !important;
    border: 2px solid var(--muted-foreground) !important;
    color: var(--foreground) !important;
  }
  
  .connector-pill:hover {
    background: var(--muted) !important;
    border-color: var(--foreground) !important;
  }
  
  .connector-icon {
    background: var(--muted) !important;
    color: var(--foreground) !important;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .connector-pill:hover {
    transform: none !important;
    transition: background-color 0.2s ease, border-color 0.2s ease !important;
  }
  
  .connector-pill:active {
    transform: none !important;
  }
  
  .connector-arrow {
    transition: opacity 0.2s ease !important;
  }
  
  .connector-pill:hover .connector-arrow {
    transform: none !important;
  }
}
`;