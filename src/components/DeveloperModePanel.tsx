import React, { useState, useEffect } from 'react';
import { Code, Database, Zap, AlertTriangle, Eye, RefreshCw, User, Shield, Crown, MessageSquare, Video, FileText, Users, Play, BarChart3 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { AIStatusIndicator } from './AIStatusIndicator';

interface DeveloperModePanelProps {
  onNavigate?: (screen: string, tab?: string) => void;
  onTierChange?: (tier: 'free' | 'core' | 'pro' | 'pro-plus') => void;
}

export function DeveloperModePanel({ onNavigate, onTierChange }: DeveloperModePanelProps) {
  // Debug Settings
  const [debugMode, setDebugMode] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [mockData, setMockData] = useState(false);
  const [bypassPaywall, setBypassPaywall] = useState(false);
  
  // Tier Management
  const [currentTier, setCurrentTier] = useState<'free' | 'core' | 'pro' | 'pro-plus'>('free');
  
  // Entitlements
  const [chatUnlimited, setChatUnlimited] = useState(false);
  const [reportsEnabled, setReportsEnabled] = useState(false);
  const [jrUnlocked, setJrUnlocked] = useState(false);
  const [liveVideoEnabled, setLiveVideoEnabled] = useState(false);
  
  // Caps
  const [chatMessagesLeft, setChatMessagesLeft] = useState(10);
  const [jrMinutesLeft, setJrMinutesLeft] = useState(30);
  const [videoMinutesLeft, setVideoMinutesLeft] = useState(12);

  // Load tier from localStorage on mount
  useEffect(() => {
    const userData = localStorage.getItem('aminy-user');
    if (userData) {
      try {
        const data = JSON.parse(userData);
        if (data.tier) {
          setCurrentTier(data.tier);
          updateEntitlementsForTier(data.tier);
        }
      } catch (e) {
        console.error('Failed to parse user data', e);
      }
    }
  }, []);

  const updateEntitlementsForTier = (tier: 'free' | 'core' | 'pro' | 'pro-plus') => {
    switch (tier) {
      case 'free':
        setChatUnlimited(false);
        setReportsEnabled(false);
        setJrUnlocked(false);
        setLiveVideoEnabled(false);
        setChatMessagesLeft(10);
        setJrMinutesLeft(0);
        setVideoMinutesLeft(0);
        break;
      case 'core':
        setChatUnlimited(true);
        setReportsEnabled(true);
        setJrUnlocked(true);
        setLiveVideoEnabled(true);
        setChatMessagesLeft(999);
        setJrMinutesLeft(30);
        setVideoMinutesLeft(12);
        break;
      case 'pro':
        setChatUnlimited(true);
        setReportsEnabled(true);
        setJrUnlocked(true);
        setLiveVideoEnabled(true);
        setChatMessagesLeft(999);
        setJrMinutesLeft(999);
        setVideoMinutesLeft(60);
        break;
      case 'pro-plus':
        setChatUnlimited(true);
        setReportsEnabled(true);
        setJrUnlocked(true);
        setLiveVideoEnabled(true);
        setChatMessagesLeft(999);
        setJrMinutesLeft(999);
        setVideoMinutesLeft(999);
        break;
    }
  };

  const handleTierChange = (tier: 'free' | 'core' | 'pro' | 'pro-plus') => {
    setCurrentTier(tier);
    updateEntitlementsForTier(tier);
    
    // Update localStorage
    const userData = localStorage.getItem('aminy-user');
    if (userData) {
      try {
        const data = JSON.parse(userData);
        data.tier = tier;
        localStorage.setItem('aminy-user', JSON.stringify(data));
      } catch (e) {
        console.error('Failed to update tier', e);
      }
    }
    
    // Notify parent component
    onTierChange?.(tier);
    toast.success(`Tier updated to ${tier.replace('-', ' ').toUpperCase()}`);
  };

  const handleFillSampleFamily = () => {
    const sampleData = {
      parentName: 'Sarah Johnson',
      childName: 'Alex',
      childId: 'alex-123',
      relationship: 'parent',
      state: 'California',
      email: 'sarah@example.com',
      hasCompletedOnboarding: true,
      tier: currentTier,
      childAge: 5,
      diagnosis: 'Autism Spectrum Disorder',
      communicationLevel: 'Short phrases',
      focusAreas: ['Communication & Speech', 'Social Skills', 'Daily Routines'],
      goals: ['Improve expressive language', 'Increase peer interactions', 'Master morning routine'],
      preferences: {
        tone: 'encouraging',
        detailLevel: 'balanced'
      }
    };
    
    localStorage.setItem('aminy-user', JSON.stringify(sampleData));
    toast.success('Sample family data loaded! Refreshing...');
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleClearCache = () => {
    localStorage.clear();
    toast.success('Cache cleared!');
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem('aminy-user');
    toast.success('Onboarding reset! Refreshing...');
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleExportLogs = () => {
    const logs = {
      timestamp: new Date().toISOString(),
      userData: localStorage.getItem('aminy-user'),
      settings: {
        debugMode,
        showLogs,
        mockData,
        bypassPaywall
      },
      tier: currentTier,
      entitlements: {
        chatUnlimited,
        reportsEnabled,
        jrUnlocked,
        liveVideoEnabled
      },
      caps: {
        chatMessagesLeft,
        jrMinutesLeft,
        videoMinutesLeft
      },
      performance: {
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        memory: (performance as any).memory?.usedJSHeapSize || 'N/A'
      }
    };
    
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aminy-dev-logs-${Date.now()}.json`;
    a.click();
    toast.success('Logs exported!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Code className="w-5 h-5 text-purple-600" />
        <h2 className="text-xl font-semibold">Developer Mode</h2>
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          Advanced
        </Badge>
        <AIStatusIndicator />
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <p className="text-sm font-semibold text-amber-900">Warning</p>
        </div>
        <p className="text-xs text-amber-700">
          These settings are for development and testing only. Changes affect local state.
        </p>
      </div>

      {/* Quick Navigation */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-600" />
          Quick Jump To
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onNavigate?.('splash');
              toast.success('Navigating to Splash...');
            }}
          >
            Splash
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onNavigate?.('onboarding');
              toast.success('Navigating to Onboarding...');
            }}
          >
            Onboarding
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onNavigate?.('dashboard', 'home');
              toast.success('Navigating to Home...');
            }}
          >
            Home
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onNavigate?.('dashboard', 'care');
              toast.success('Navigating to Care...');
            }}
          >
            Care
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onNavigate?.('dashboard', 'reports');
              toast.success('Navigating to Reports...');
            }}
          >
            Reports
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onNavigate?.('dashboard', 'hub');
              toast.success('Navigating to Hub...');
            }}
          >
            Hub
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onNavigate?.('junior');
              toast.success('Navigating to Jr Mode...');
            }}
          >
            Jr Mode
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onNavigate?.('benefits');
              toast.success('Navigating to Benefits...');
            }}
          >
            Benefits
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onNavigate?.('telehealth');
              toast.success('Navigating to Telehealth...');
            }}
          >
            Telehealth
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onNavigate?.('paywall');
              toast.success('Navigating to Paywall...');
            }}
          >
            Paywall
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onNavigate?.('caregivers');
              toast.success('Navigating to Caregivers...');
            }}
          >
            Caregivers
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onNavigate?.('vault');
              toast.success('Navigating to Vault...');
            }}
          >
            Vault
          </Button>
        </div>

        {/* Phase 2 Features Section */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">
              Phase 2
            </Badge>
            <span className="text-xs text-slate-500">BCBA Coach Portal & Analytics</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                onNavigate?.('phase2-menu');
                toast.success('Opening Phase 2 Menu...');
              }}
              className="border-purple-200 hover:bg-purple-50"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Phase 2 Menu
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                onNavigate?.('bcba-portal');
                toast.success('Opening BCBA Portal...');
              }}
              className="border-purple-200 hover:bg-purple-50"
            >
              <Users className="w-3 h-3 mr-1" />
              BCBA Portal
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                onNavigate?.('analytics');
                toast.success('Opening Analytics...');
              }}
              className="border-purple-200 hover:bg-purple-50"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Analytics
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                onNavigate?.('launch-status');
                toast.success('Opening Launch Status...');
              }}
              className="border-purple-200 hover:bg-purple-50"
            >
              <Play className="w-3 h-3 mr-1" />
              Launch Status
            </Button>
          </div>
        </div>
      </Card>

      {/* Tier Management */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-600" />
          Tier Management
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Current Tier</label>
            <Select value={currentTier} onValueChange={handleTierChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Free (No subscription)
                  </div>
                </SelectItem>
                <SelectItem value="core">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Core ($14.99/mo)
                  </div>
                </SelectItem>
                <SelectItem value="pro">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Pro ($29.99/mo)
                  </div>
                </SelectItem>
                <SelectItem value="pro-plus">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-purple-600" />
                    Pro Plus ($49.99/mo)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Entitlements */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-600" />
          Entitlements
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Chat Unlimited</p>
                <p className="text-xs text-muted-foreground">Unlimited Ask Aminy messages</p>
              </div>
            </div>
            <Switch 
              checked={chatUnlimited} 
              onCheckedChange={setChatUnlimited}
              aria-label="Toggle chat unlimited"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <div>
                <p className="font-medium text-sm">Reports Enabled</p>
                <p className="text-xs text-muted-foreground">PDF exports & provider packets</p>
              </div>
            </div>
            <Switch 
              checked={reportsEnabled} 
              onCheckedChange={setReportsEnabled}
              aria-label="Toggle reports enabled"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-green-600" />
              <div>
                <p className="font-medium text-sm">Jr Unlocked</p>
                <p className="text-xs text-muted-foreground">Full Aminy Jr access</p>
              </div>
            </div>
            <Switch 
              checked={jrUnlocked} 
              onCheckedChange={setJrUnlocked}
              aria-label="Toggle Jr unlocked"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-red-600" />
              <div>
                <p className="font-medium text-sm">Live Video Enabled</p>
                <p className="text-xs text-muted-foreground">Live AI Video sessions</p>
              </div>
            </div>
            <Switch 
              checked={liveVideoEnabled} 
              onCheckedChange={setLiveVideoEnabled}
              aria-label="Toggle live video enabled"
            />
          </div>
        </div>
      </Card>

      {/* Usage Caps */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-orange-600" />
          Usage Caps
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Chat Messages Left</label>
              <span className="text-sm font-bold text-blue-600">{chatMessagesLeft}</span>
            </div>
            <input
              type="range"
              min="0"
              max="999"
              value={chatMessagesLeft}
              onChange={(e) => setChatMessagesLeft(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Jr Minutes Left</label>
              <span className="text-sm font-bold text-green-600">{jrMinutesLeft}</span>
            </div>
            <input
              type="range"
              min="0"
              max="999"
              value={jrMinutesLeft}
              onChange={(e) => setJrMinutesLeft(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Video Minutes Left</label>
              <span className="text-sm font-bold text-red-600">{videoMinutesLeft}</span>
            </div>
            <input
              type="range"
              min="0"
              max="999"
              value={videoMinutesLeft}
              onChange={(e) => setVideoMinutesLeft(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
          </div>
        </div>
      </Card>

      {/* Debug Settings */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Debug Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Debug Mode</p>
              <p className="text-xs text-muted-foreground">Enable console logging</p>
            </div>
            <Switch 
              checked={debugMode} 
              onCheckedChange={setDebugMode}
              aria-label="Toggle debug mode"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Show Logs</p>
              <p className="text-xs text-muted-foreground">Display on-screen logs</p>
            </div>
            <Switch 
              checked={showLogs} 
              onCheckedChange={setShowLogs}
              aria-label="Toggle show logs"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Mock Data</p>
              <p className="text-xs text-muted-foreground">Use sample responses</p>
            </div>
            <Switch 
              checked={mockData} 
              onCheckedChange={setMockData}
              aria-label="Toggle mock data"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Bypass Paywall</p>
              <p className="text-xs text-muted-foreground">Access all features</p>
            </div>
            <Switch 
              checked={bypassPaywall} 
              onCheckedChange={setBypassPaywall}
              aria-label="Toggle bypass paywall"
            />
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          Data Management
        </h3>
        <div className="space-y-3">
          <Button 
            variant="default" 
            className="w-full" 
            onClick={handleFillSampleFamily}
          >
            <Users className="w-4 h-4 mr-2" />
            Fill with Sample Family
          </Button>

          <Button variant="outline" className="w-full" onClick={handleResetOnboarding}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Onboarding
          </Button>

          <Button variant="outline" className="w-full" onClick={handleClearCache}>
            <Database className="w-4 h-4 mr-2" />
            Clear Cache
          </Button>

          <Button variant="outline" className="w-full" onClick={handleExportLogs}>
            <Eye className="w-4 h-4 mr-2" />
            Export Debug Logs
          </Button>
        </div>
      </Card>

      {/* Performance Metrics */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-600" />
          Performance Metrics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Screen Size</p>
            <p className="text-sm font-bold">{window.innerWidth}x{window.innerHeight}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">User Agent</p>
            <p className="text-sm font-bold truncate" title={navigator.userAgent}>
              {navigator.userAgent.split(' ')[0]}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Tier</p>
            <p className="text-sm font-bold">{currentTier.toUpperCase()}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Entitlements</p>
            <p className="text-sm font-bold">
              {[chatUnlimited, reportsEnabled, jrUnlocked, liveVideoEnabled].filter(Boolean).length}/4
            </p>
          </div>
        </div>
      </Card>

      {/* Feature Flags */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          Feature Flags
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">Ask Aminy (Front & Center)</span>
            <Badge className="bg-green-100 text-green-700 border-green-200">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">Live AI Video</span>
            <Badge className="bg-green-100 text-green-700 border-green-200">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">Benefits Navigator</span>
            <Badge className="bg-green-100 text-green-700 border-green-200">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">Telehealth</span>
            <Badge className="bg-green-100 text-green-700 border-green-200">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">Multi-Child Support</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Beta</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">Connector Hub</span>
            <Badge className="bg-green-100 text-green-700 border-green-200">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">B2B2C Portal</span>
            <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">Coming Soon</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
