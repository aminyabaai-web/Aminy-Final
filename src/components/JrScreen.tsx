import React, { useState, useEffect } from 'react';
import { JrSetupWizard } from './JrSetupWizard';
import { JrKidMode } from './JrKidMode';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { toast } from 'sonner';
import { 
  Smartphone,
  QrCode,
  Settings,
  Trash2,
  Plus,
  Gamepad2,
  Shield,
  CheckCircle,
  Users,
  Zap,
  Target,
  Lock,
  Unlock,
  Gift,
  Smile,
  Brain,
  Edit,
  Star,
  User,
  Volume2,
  VolumeX,
  X,
  Info,
  Mic,
  MicOff,
  Key
} from 'lucide-react';
import type { JrProfile, Device } from '../types/connector';
import { connectorHub, CONNECTOR_EVENTS } from '../lib/connector-hub';
import { GlobalDisclaimer } from './GlobalDisclaimer';

interface JrScreenProps {
  childName: string;
  jrProfile?: JrProfile;
  userTier: string | null;
  connectorData: {
    devices: Map<string, Device>;
    [key: string]: any;
  };
}

export const JrScreen: React.FC<JrScreenProps> = ({ 
  childName, 
  jrProfile, 
  userTier,
  connectorData 
}) => {
  // State management
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showPairDevice, setShowPairDevice] = useState(false);
  const [isKidMode, setIsKidMode] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isExitingKidMode, setIsExitingKidMode] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [showPinChangeSheet, setShowPinChangeSheet] = useState(false);
  const [showDifficultySheet, setShowDifficultySheet] = useState(false);

  // Get child's first name for personalized UI
  const childFirstName = childName.split(' ')[0];

  // Data-bound tokens from jrProfile
  const [tokens, setTokens] = useState(jrProfile?.tokenBalance || 24);

  // Enhanced preferences state with proper data binding
  const [preferences, setPreferences] = useState({
    voiceMode: (jrProfile?.voiceMode || 'auto-captions') as 'off' | 'auto-captions' | 'voice-only',
    contentLevel: (jrProfile?.contentLevel || 'standard') as 'gentle' | 'standard',
    difficulty: jrProfile?.difficultyLevel || 3,
    rewardCost: jrProfile?.defaultRewardCost || 3,
    topRewards: jrProfile?.topRewards || ['Extra screen time', 'Stickers', 'Special snack']
  });

  // Prompting ladder state with localStorage persistence
  const [promptLevel, setPromptLevel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("aminy:promptLevel");
      return saved || "Model";
    }
    return "Model";
  });

  // ABA coach tips toggle state with localStorage persistence
  const [showABACoachTips, setShowABACoachTips] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("aminy:showABACoachTips");
      return saved !== null ? saved === 'true' : true; // Default to true
    }
    return true;
  });

  // Get child devices from connector data with proper typing
  const childDevices: Device[] = Array.from(connectorData?.devices?.values() || [])
    .filter(device => device.childId === 'child-1');

  // Get plan data for device limits
  const maxDevices = userTier === 'pro' ? Infinity : 1;

  // Check prefers-reduced-motion for accessibility
  const prefersReducedMotion = typeof window !== 'undefined' ? 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

  // Load tokens from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTokens = localStorage.getItem('jr-tokens');
      if (savedTokens) {
        setTokens(parseInt(savedTokens, 10));
      }
    }
  }, []);

  // Listen for prompt level changes in localStorage (for real-time updates)
  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== 'undefined') {
        const savedPromptLevel = localStorage.getItem("aminy:promptLevel");
        if (savedPromptLevel && savedPromptLevel !== promptLevel) {
          setPromptLevel(savedPromptLevel);
        }
      }
    };

    // Listen for storage changes from other components/tabs
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [promptLevel]);

  // Save tokens to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jr-tokens', tokens.toString());
    }
  }, [tokens]);

  const handleSwitchToKid = () => {
    if (childDevices.length === 0) {
      toast.error('Pair a device first.');
      return;
    }
    setIsExitingKidMode(false);
    setShowPinModal(true);
    // Analytics tracked
  };

  const handleExitKidMode = () => {
    setIsExitingKidMode(true);
    setShowPinModal(true);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPinInput(value);
    setPinError('');
  };

  const handlePinKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && pinInput.length === 4) {
      handlePinSubmit();
    }
  };

  const handlePinSubmit = () => {
    const correctPin = '1234'; // In real app, this would be user-configurable
    
    if (pinInput === correctPin) {
      if (isExitingKidMode) {
        setIsKidMode(false);
      } else {
        setIsKidMode(true);
      }
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Incorrect PIN. Try again.');
      setPinInput('');
    }
  };

  const handleSessionComplete = (sessionData: any) => {
    // Publish session completed event to connector hub
    connectorHub.publish(CONNECTOR_EVENTS.JR_SESSION_COMPLETED, {
      childId: 'child-1',
      ...sessionData
    }, 'jr-screen');

  };

  const handleRunCalibration = () => {
    if (childDevices.length === 0) {
      toast.error('Pair a device first.');
      return;
    }
    setShowCalibration(true);
    setCalibrationStep(0);
    // Analytics tracked
  };

  const handleCalibrationStart = () => {
    setIsCalibrating(true);
    setCalibrationStep(1);
    
    // Simulate calibration steps with timing
    const steps = [
      { step: 1, delay: 2000, text: 'Checking mic input...' },
      { step: 2, delay: 3000, text: 'Testing screen tap targets...' },
      { step: 3, delay: 2500, text: 'Measuring attention timing...' },
      { step: 4, delay: 1500, text: 'Finalizing calibration...' }
    ];
    
    let currentStep = 0;
    const processStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setTimeout(() => {
          setCalibrationStep(step.step + 1);
          currentStep++;
          if (currentStep < steps.length) {
            processStep();
          } else {
            // Calibration complete
            setTimeout(() => {
              handleCalibrationComplete();
            }, 1000);
          }
        }, step.delay);
      }
    };
    
    processStep();
  };

  const handleCalibrationComplete = () => {
    setIsCalibrating(false);
    setShowCalibration(false);
    setCalibrationStep(0);
    
    // Update jrProfile if available
    if (jrProfile) {
      jrProfile.baselineCompleted = true;
      jrProfile.calibratedAt = new Date().toISOString();
    }
    
    toast.success('Calibration complete! Settings optimized for ' + childFirstName + '.');
  };

  // Prompting ladder handler
  const handlePromptLevelChange = (level: string) => {
    setPromptLevel(level);
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem("aminy:promptLevel", level);

      // Update child preferences if available
      if (window.aminy?.updateChildPrefs) {
        try {
          window.aminy.updateChildPrefs({ promptLevel: level });
        } catch (error) {
          // Silently handle error
        }
      }
    }
    // Analytics tracked
  };

  // ABA coach tips toggle handler
  const handleABACoachTipsToggle = (enabled: boolean) => {
    setShowABACoachTips(enabled);

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem("aminy:showABACoachTips", enabled.toString());
    }
    // Analytics tracked
  };

  const handleAddReward = (reward: string) => {
    if (preferences.topRewards.length < 5) {
      setPreferences(prev => ({
        ...prev,
        topRewards: [...prev.topRewards, reward]
      }));
      // Analytics tracked
    }
  };

  const handleRemoveReward = (index: number) => {
    setPreferences(prev => ({
      ...prev,
      topRewards: prev.topRewards.filter((_, i) => i !== index)
    }));
  };

  const handlePairDevice = () => {
    if (userTier !== 'pro' && childDevices.length >= maxDevices) {
      toast.error('Upgrade to Pro for unlimited devices.');
      return;
    }
    setShowPairDevice(true);
  };

  const handleRemoveDevice = (deviceId: string) => {
    // In real app, this would remove from connectorData
    toast.success('Device removed successfully.');
    // Analytics tracked
  };

  const handleChangePIN = (deviceId: string) => {
    setShowPinChangeSheet(true);
    // Analytics tracked
  };

  const getDifficultyBand = (difficulty: number) => {
    if (difficulty <= 2) return 'Gentle';
    if (difficulty <= 4) return 'Standard';
    return 'Challenging';
  };

  const handleTokensChange = (newTokens: number) => {
    setTokens(newTokens);
  };

  // Show setup wizard if no profile exists
  if (!jrProfile && !showSetupWizard) {
    return (
      <div className="min-h-screen bg-gray-50/30 pb-20">
        <div className="bg-white border-b border-gray-100 px-4 py-6">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <div className="text-2xl" role="img" aria-hidden="true">
                🎮
              </div>
              <div>
                <h1 className="text-xl text-primary font-medium">Aminy Junior</h1>
                <p className="text-sm text-muted-foreground">Learning companion setup</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-md mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4 sm:mb-6">🚀</div>
            <h2 className="text-lg sm:text-xl font-semibold text-primary mb-4">Welcome to Aminy Junior!</h2>
            <p className="text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
              Let's set up {childName}'s personalized learning experience with speech practice, social skills, and fun activities.
            </p>
            <Button 
              onClick={() => setShowSetupWizard(true)}
              className="w-full"
            >
              Get Started
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (showSetupWizard) {
    return (
      <JrSetupWizard
        childName={childName}
        onComplete={(profile) => {
          setShowSetupWizard(false);
        }}
        onBack={() => setShowSetupWizard(false)}
      />
    );
  }

  if (isKidMode) {
    return (
      <JrKidMode
        childName={childName}
        jrProfile={jrProfile}
        onExit={handleExitKidMode}
        onSessionComplete={handleSessionComplete}
        onTokensChange={handleTokensChange}
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50/30 pb-20">
        {/* Parent Mode Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-6">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white text-lg font-bold">
                  {childName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <h1 className="text-xl text-primary font-medium">Aminy Junior</h1>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            jrProfile?.status === 'active' 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}
                        >
                          {jrProfile?.status === 'active' ? 'Active' : 'Paused'}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{jrProfile?.status === 'active' ? 'Aminy Junior ready on this device.' : 'Aminy Junior is paused.'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm text-muted-foreground">{childName}'s learning companion</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <Star className="w-3 h-3 mr-1" />
                      {tokens}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tokens earned from sessions</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSwitchToKid}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                      size="sm"
                    >
                      Start Kid Session
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter Aminy Junior Mode on this device</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            {/* Helper Text */}
            <div className="mt-3 text-center">
              <p className="text-xs text-muted-foreground">
                Aminy Junior sessions sync to your plan automatically.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Profile Card */}
            <Card className="p-6 aminy-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-full">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary">Profile</h3>
                  <p className="text-sm text-muted-foreground">
                    {childName}'s learning settings
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreferences(true)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit settings</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Target Set:</span>
                  <span className="font-medium">
                    {jrProfile?.targetSet || 'Speech set'} — {
                      jrProfile?.targetBand?.charAt(0).toUpperCase() + 
                      jrProfile?.targetBand?.slice(1).toLowerCase() || 'Intermediate'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Difficulty Band:</span>
                  <span className="font-medium">
                    {jrProfile?.difficultyBand?.charAt(0).toUpperCase() + 
                     jrProfile?.difficultyBand?.slice(1).toLowerCase() || 
                     getDifficultyBand(preferences.difficulty)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Max Session Length:</span>
                  <span className="font-medium">{jrProfile?.maxSessionMin || 20} min</span>
                </div>
              </div>
            </Card>

            {/* Preferences Card */}
            <Card className="p-6 aminy-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary">Preferences</h3>
                  <p className="text-sm text-muted-foreground">Personalized for {childFirstName}</p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* Voice Mode */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm font-medium">Voice mode:</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Auto-captions stores text only; no audio is kept. You can turn mic off anytime.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-medium flex items-center gap-1">
                      {preferences.voiceMode === 'off' ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      {preferences.voiceMode === 'off' ? 'Off' : 
                       preferences.voiceMode === 'auto-captions' ? 'Auto-captions' : 'Voice only'}
                    </span>
                  </div>
                </div>

                {/* Content Level */}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Content Level:</span>
                  <span className="font-medium">
                    {preferences.contentLevel.charAt(0).toUpperCase() + preferences.contentLevel.slice(1)}
                  </span>
                </div>

                {/* Reward Cost */}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Default reward cost:</span>
                  <span className="font-medium">{preferences.rewardCost} tokens</span>
                </div>

                {/* Top Rewards */}
                <div>
                  <div className="text-sm font-medium text-primary mb-2">Top Rewards</div>
                  <div className="flex flex-wrap gap-2">
                    {preferences.topRewards.map((reward, index) => (
                      <Badge key={index} variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                        {reward}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm font-medium">Difficulty:</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Affects game prompts and timing</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Current level:</span>
                    <span className="font-medium">{preferences.difficulty}/5</span>
                  </div>
                </div>

                {/* Prompting Ladder */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm font-medium">Prompting ladder:</Label>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {['Model', 'Gesture', 'Verbal', 'Visual', 'Independent'].map((level) => (
                        <button
                          key={level}
                          onClick={() => handlePromptLevelChange(level)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                            promptLevel === level
                              ? 'bg-accent text-accent-foreground border-accent shadow-sm'
                              : 'bg-background text-muted-foreground border-border hover:border-accent hover:text-accent'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Start here; fade as your child succeeds.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Devices Card */}
            <Card className="p-6 aminy-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Smartphone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">Devices</h3>
                    <p className="text-sm text-muted-foreground">
                      {userTier === 'pro' 
                        ? 'Unlimited devices' 
                        : `${childDevices.length} of ${maxDevices} device${maxDevices !== 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePairDevice}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Pair new device
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Scan a code or enter a 6-digit pairing code</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="space-y-3">
                {childDevices.length > 0 ? (
                  childDevices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4 h-4 text-gray-600" />
                        <div>
                          <div className="font-medium text-sm">{device.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Last seen: {new Date(device.lastSeenAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleChangePIN(device.id)}
                            >
                              <Key className="w-4 h-4 text-blue-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Change PIN</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDevice(device.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove device</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm mb-2">Pair a device to start Aminy Junior Mode</p>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handlePairDevice}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Pair device
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* ABA Coach Tips - Prompting Ladder */}
            {showABACoachTips && (
              <Card className="p-6 aminy-card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Brain className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-primary">Prompting ladder</h3>
                    <p className="text-sm text-muted-foreground">ABA coaching tip</p>
                  </div>
                </div>
                
                <div className="p-4 bg-white/70 rounded-lg border border-blue-100">
                  <p className="text-sm text-primary leading-relaxed">
                    Start at <span className="font-semibold text-blue-600">{promptLevel}</span> and fade: Model → Gesture → Verbal → Visual → Independent. Praise and token when independent.
                  </p>
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="p-6 aminy-card">
              <h3 className="font-semibold text-primary mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowDifficultySheet(true)}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Adjust Difficulty
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowPreferences(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Update Preferences
                </Button>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="w-full justify-start bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={handleRunCalibration}
                    >
                      <Gamepad2 className="w-4 h-4 mr-2" />
                      Run calibration
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fast mic/screen check; no audio is stored</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </Card>
          </div>
          
          {/* Aminy Junior Disclaimer */}
          <div className="mt-4 sm:mt-6">
            <GlobalDisclaimer variant="card" showIcon={true} />
          </div>
        </div>

        {/* PIN Modal */}
        {showPinModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-sm w-full p-6">
              <div className="text-center mb-4 sm:mb-6">
                <div className="p-3 bg-accent/10 rounded-full inline-flex mb-4">
                  <Lock className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-primary mb-2">
                  {isExitingKidMode ? 'Exit Aminy Junior Mode' : 'Enter Aminy Junior Mode'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enter the 4-digit PIN to {isExitingKidMode ? 'return to parent view' : 'switch to Aminy Junior mode'}
                </p>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pinInput}
                    onChange={handlePinChange}
                    onKeyPress={handlePinKeyPress}
                    placeholder="••••"
                    className="text-center text-2xl font-mono tracking-widest"
                    autoFocus
                  />
                  {pinError && (
                    <p className="text-sm text-red-500 mt-2 text-center">{pinError}</p>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowPinModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePinSubmit}
                    className="flex-1"
                    disabled={pinInput.length !== 4}
                  >
                    {isExitingKidMode ? 'Exit' : 'Enter'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Pair Device Modal */}
        {showPairDevice && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full p-6">
              <div className="text-center mb-4 sm:mb-6">
                <QrCode className="w-16 h-16 bg-gray-100 border-2 border-gray-300 rounded-lg mx-auto mb-4 p-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-primary mb-2">Pair New Device</h3>
                <div className="text-lg font-mono font-bold text-primary mb-2">
                  {Math.random().toString(36).substring(2, 8).toUpperCase()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter this code on the new device
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowPairDevice(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Simulate device pairing
                    const newDevice = {
                      id: `device-${Date.now()}`,
                      childId: 'child-1',
                      platform: 'ios' as const,
                      name: `${childFirstName}'s Device`,
                      lastSeenAt: new Date()
                    };
                    
                    // Publish device paired event
                    connectorHub.publish(CONNECTOR_EVENTS.DEVICE_PAIRED, {
                      childId: 'child-1',
                      platform: 'ios',
                      name: newDevice.name
                    }, 'jr-screen');
                    
                    toast.success('Device paired successfully!');
                    setShowPairDevice(false);
                    // Analytics tracked
                  }}
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Calibration Sheet */}
        {showCalibration && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full p-6">
              <div className="text-center mb-4 sm:mb-6">
                <div className="p-3 bg-purple-100 rounded-full inline-flex mb-4">
                  <Gamepad2 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-primary mb-2">
                  {isCalibrating ? 'Calibrating...' : 'Run Calibration'}
                </h3>
                <div className="text-sm text-muted-foreground mb-4">
                  <p className="font-medium mb-2">What calibration does:</p>
                  <p>Checks mic input, screen tap targets, and attention timing to fine-tune prompts. No audio is stored.</p>
                </div>
                
                {isCalibrating && (
                  <div className="space-y-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${(calibrationStep / 5) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm">
                      {calibrationStep === 1 && 'Checking mic input...'}
                      {calibrationStep === 2 && 'Testing screen tap targets...'}
                      {calibrationStep === 3 && 'Measuring attention timing...'}
                      {calibrationStep === 4 && 'Finalizing calibration...'}
                      {calibrationStep >= 5 && 'Complete!'}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowCalibration(false);
                    setIsCalibrating(false);
                    setCalibrationStep(0);
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={isCalibrating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={isCalibrating ? undefined : handleCalibrationStart}
                  className="flex-1"
                  disabled={isCalibrating}
                >
                  {isCalibrating ? 'Running...' : 'Start Calibration'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Difficulty Adjustment Sheet */}
        <Sheet open={showDifficultySheet} onOpenChange={setShowDifficultySheet}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Adjust Difficulty</SheetTitle>
              <SheetDescription>
                Set the challenge level for {childFirstName}'s activities
              </SheetDescription>
            </SheetHeader>
            
            <div className="py-6">
              <Label className="text-sm font-medium mb-4 block">Difficulty Level:</Label>
              <Slider
                value={[preferences.difficulty]}
                onValueChange={([value]) => setPreferences(prev => ({ ...prev, difficulty: value }))}
                min={1}
                max={5}
                step={1}
                className="w-full mb-4"
                aria-label={`Difficulty level ${preferences.difficulty} out of 5`}
              />
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>Gentle</span>
                <span>Standard</span>
                <span>Challenging</span>
              </div>
              <p className="text-center text-lg font-medium">{preferences.difficulty}/5 - {getDifficultyBand(preferences.difficulty)}</p>
              
              <div className="mt-4 sm:mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <Info className="w-4 h-4 inline mr-1" />
                  Affects game prompts and timing. Changes take effect immediately.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDifficultySheet(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowDifficultySheet(false);
                  toast.success('Difficulty updated!');
                  // Analytics tracked
                }}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Preferences Sheet */}
        <Sheet open={showPreferences} onOpenChange={setShowPreferences}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Preferences</SheetTitle>
              <SheetDescription>
                Manage settings for {childFirstName}'s learning experience
              </SheetDescription>
            </SheetHeader>
            
            <div className="py-6 space-y-3 sm:space-y-4 sm:space-y-6">
              {/* ABA Coach Tips Toggle */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Coaching Tips</Label>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">Show ABA coach tips (parent only)</div>
                    <div className="text-xs text-muted-foreground">Display helpful prompting guidance and strategies</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{showABACoachTips ? 'On' : 'Off'}</span>
                    <button
                      onClick={() => handleABACoachTipsToggle(!showABACoachTips)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showABACoachTips ? 'bg-accent' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={showABACoachTips}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showABACoachTips ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Other Settings Placeholder */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  Additional preference settings will appear here
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setShowPreferences(false)}
                variant="outline"
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* PIN Change Sheet */}
        <Sheet open={showPinChangeSheet} onOpenChange={setShowPinChangeSheet}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Change PIN</SheetTitle>
              <SheetDescription>
                Set a new 4-digit PIN for accessing parent mode
              </SheetDescription>
            </SheetHeader>
            
            <div className="py-6 space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="current-pin" className="text-sm font-medium">Current PIN</Label>
                <Input
                  id="current-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="••••"
                  className="text-center text-xl font-mono tracking-widest mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="new-pin" className="text-sm font-medium">New PIN</Label>
                <Input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="••••"
                  className="text-center text-xl font-mono tracking-widest mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="confirm-pin" className="text-sm font-medium">Confirm New PIN</Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="••••"
                  className="text-center text-xl font-mono tracking-widest mt-1"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setShowPinChangeSheet(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowPinChangeSheet(false);
                  toast.success('PIN updated successfully!');
                }}
                className="flex-1"
              >
                Update PIN
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
};