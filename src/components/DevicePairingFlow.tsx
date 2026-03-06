import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { DisclaimerFooter } from './DisclaimerFooter';
import { UrgentHelpModal } from './UrgentHelpModal';
import { HelpCenter } from './HelpCenter';
import { ChildProfileChip } from './ChildProfileChip';
import { useDisplayNames } from '../lib/name-store';
import { toast } from 'sonner';
import {
  Bell,
  Smartphone,
  Tablet,
  Wifi,
  CheckCircle,
  XCircle,
  QrCode,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Zap,
  Shield,
  Users,
  Clock,
  AlertTriangle,
  Search,
  Settings,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface PairedDevice {
  id: string;
  name: string;
  type: 'ipad' | 'tablet' | 'phone';
  status: 'active' | 'inactive' | 'pending';
  lastSeen: string;
  pairingCode: string;
}

interface DevicePairingFlowProps {
  userData: {
    parentName: string;
    childName: string;
  };
  userTier?: string;
  onClose?: () => void;
  onComplete?: (deviceInfo: PairedDevice) => void;
  onPaywallTrigger?: () => void;
}

export function DevicePairingFlow({ 
  userData, 
  userTier = 'starter',
  onClose,
  onComplete,
  onPaywallTrigger 
}: DevicePairingFlowProps) {
  const { caregiverShort, childShort } = useDisplayNames();
  const [showUrgentHelp, setShowUrgentHelp] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [currentStep, setCurrentStep] = useState<'start' | 'scanning' | 'manual' | 'pairing' | 'success'>('start');
  const [pairingCode, setPairingCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isPairing, setIsPairing] = useState(false);

  // Safe data extraction
  const safeUserData = userData || { parentName: 'Parent', childName: 'Child' };
  const safeChildName = safeUserData.childName || childShort || 'Child';
  const safeCaregiverName = safeUserData.parentName || caregiverShort || 'Parent';

  // Mock paired devices
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([
    {
      id: '1',
      name: `${safeChildName}'s iPad`,
      type: 'ipad',
      status: 'active',
      lastSeen: 'Just now',
      pairingCode: 'ABC123'
    }
  ]);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'ipad': return <Tablet className="w-5 h-5" />;
      case 'tablet': return <Tablet className="w-5 h-5" />;
      case 'phone': return <Smartphone className="w-5 h-5" />;
      default: return <Tablet className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'inactive': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-amber-600" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-200';
      case 'inactive': return 'bg-red-50 text-red-700 border-red-200';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const handleScanQR = () => {
    if (userTier === 'starter' && onPaywallTrigger) {
      onPaywallTrigger();
      return;
    }

    setCurrentStep('scanning');
    setIsScanning(true);
    
    // Simulate scanning process
    setTimeout(() => {
      setIsScanning(false);
      setCurrentStep('pairing');
      setIsPairing(true);
      
      // Simulate successful pairing
      setTimeout(() => {
        setIsPairing(false);
        setCurrentStep('success');
        
        // Add new device
        const newDevice: PairedDevice = {
          id: Date.now().toString(),
          name: `${safeChildName}'s New Device`,
          type: 'tablet',
          status: 'active',
          lastSeen: 'Just now',
          pairingCode: 'DEF456'
        };
        
        setPairedDevices(prev => [...prev, newDevice]);
        
        if (onComplete) {
          onComplete(newDevice);
        }
        
        toast.success('Device paired successfully!', {
          description: `${newDevice.name} is now connected and ready to use.`,
          duration: 3000,
        });
      }, 2000);
    }, 3000);
  };

  const handleManualPairing = () => {
    if (!pairingCode.trim()) {
      toast.error('Please enter a pairing code');
      return;
    }

    if (userTier === 'starter' && onPaywallTrigger) {
      onPaywallTrigger();
      return;
    }

    setCurrentStep('pairing');
    setIsPairing(true);
    
    // Simulate pairing process
    setTimeout(() => {
      setIsPairing(false);
      setCurrentStep('success');
      
      // Add new device
      const newDevice: PairedDevice = {
        id: Date.now().toString(),
        name: `${safeChildName}'s Device`,
        type: 'tablet',
        status: 'active',
        lastSeen: 'Just now',
        pairingCode: pairingCode.toUpperCase()
      };
      
      setPairedDevices(prev => [...prev, newDevice]);
      
      if (onComplete) {
        onComplete(newDevice);
      }
      
      toast.success('Device paired successfully!', {
        description: `Device with code ${pairingCode.toUpperCase()} is now connected.`,
        duration: 3000,
      });
    }, 2000);
  };

  const handleRemoveDevice = (deviceId: string) => {
    setPairedDevices(prev => prev.filter(d => d.id !== deviceId));
    toast.success('Device removed', {
      description: 'The device has been unpaired and removed from your account.',
      duration: 3000,
    });
  };

  const renderStartScreen = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Wifi className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Connect {safeChildName}'s Device
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Pair your child's device to enable Aminy Junior mode and track their progress across activities.
        </p>
      </div>

      {/* Pairing Options */}
      <div className="grid gap-3 sm:gap-4 max-w-md mx-auto">
        <Card className="p-6 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={handleScanQR}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <QrCode className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Scan QR Code</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Fastest way to connect
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400" />
          </div>
          {userTier === 'starter' && (
            <Badge variant="secondary" className="mt-3 bg-amber-100 text-amber-800 border-amber-200">
              Requires Core or Pro
            </Badge>
          )}
        </Card>

        <Card 
          className="p-6 hover:shadow-md transition-all duration-200 cursor-pointer" 
          onClick={() => setCurrentStep('manual')}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Enter Pairing Code</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manual setup option
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400" />
          </div>
        </Card>
      </div>

      {/* Current Devices */}
      {pairedDevices.length > 0 && (
        <div className="max-w-2xl mx-auto">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Connected Devices</h3>
          <div className="space-y-3">
            {pairedDevices.map((device) => (
              <Card key={device.id} className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                      {getDeviceIcon(device.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100">{device.name}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Last seen: {device.lastSeen}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(device.status)}
                      <Badge className={getStatusColor(device.status)}>
                        {device.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDevice(device.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Benefits */}
      <Card className="max-w-2xl mx-auto">
        <div className="p-4 sm:p-5 md:p-6">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Benefits of Device Pairing</h3>
          <div className="grid gap-3 sm:gap-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100">Safe & Secure</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Kid-friendly interface with parental controls and privacy protection
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100">Progress Tracking</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Automatic activity completion and skill development insights
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100">Family Connection</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Share achievements and milestones with your care team
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderScanningScreen = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto">
        {isScanning ? (
          <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
        ) : (
          <QrCode className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        )}
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Scanning for Device
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Hold your camera steady and point it at the QR code displayed on {safeChildName}'s device.
        </p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
        <div className="w-24 h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg mx-auto flex items-center justify-center">
          <Search className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Looking for QR code...</p>
      </div>

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep('start')}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep('manual')}
          className="flex-1"
        >
          Enter Code Instead
        </Button>
      </div>
    </div>
  );

  const renderManualScreen = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Enter Pairing Code
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Find the 6-character code on {safeChildName}'s device and enter it below.
        </p>
      </div>

      <Card className="p-4 sm:p-5 md:p-6">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Pairing Code
            </label>
            <div className="relative">
              <Input
                type={showCode ? "text" : "password"}
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value)}
                placeholder="Enter 6-character code"
                className="pr-10 uppercase text-center tracking-wider font-mono"
                maxLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setShowCode(!showCode)}
              >
                {showCode ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Where to find the code</h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
                    <li>1. Open Aminy Jr app on the device</li>
                    <li>2. Go to Settings → Connect to Parent</li>
                    <li>3. The code appears on screen</li>
                  </ol>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep('start')}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={handleManualPairing}
          disabled={pairingCode.length !== 6}
          className="flex-1"
        >
          Connect Device
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderPairingScreen = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto">
        <RefreshCw className="w-8 h-8 text-green-600 dark:text-green-400 animate-spin" />
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Pairing Device
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Establishing secure connection with {safeChildName}'s device...
        </p>
      </div>

      <Progress value={75} className="w-full" />
      <p className="text-sm text-slate-500 dark:text-slate-400">This may take a few moments</p>
    </div>
  );

  const renderSuccessScreen = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Device Connected!
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          {safeChildName}'s device is now paired and ready to use with Aminy Junior.
        </p>
      </div>

      <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div className="text-left">
            <h4 className="font-medium text-green-900 dark:text-green-100">Ready to Go!</h4>
            <p className="text-sm text-green-800 dark:text-green-200">
              Activities and progress will now sync automatically
            </p>
          </div>
        </div>
      </Card>

      <Button onClick={onClose} className="w-full">
        Continue to Dashboard
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'start': return renderStartScreen();
      case 'scanning': return renderScanningScreen();
      case 'manual': return renderManualScreen();
      case 'pairing': return renderPairingScreen();
      case 'success': return renderSuccessScreen();
      default: return renderStartScreen();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl text-slate-900 dark:text-slate-100">Device Pairing</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Connect {safeChildName}'s device</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUrgentHelp(true)}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <Bell className="w-4 h-4" />
              </Button>
              <ChildProfileChip 
                child={{
                  name: safeChildName,
                  profileImage: undefined
                }}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 max-w-4xl mx-auto">
        {renderCurrentStep()}
      </div>

      {/* Modals */}
      {showUrgentHelp && (
        <UrgentHelpModal onClose={() => setShowUrgentHelp(false)} />
      )}

      {showHelpCenter && (
        <HelpCenter onClose={() => setShowHelpCenter(false)} />
      )}

      <DisclaimerFooter />
    </div>
  );
}