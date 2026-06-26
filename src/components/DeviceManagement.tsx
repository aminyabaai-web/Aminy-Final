// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
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
  WifiOff,
  CheckCircle,
  XCircle,
  Clock,
  Battery,
  Download,
  Upload,
  Settings,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Users,
  Activity,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Plus,
  Edit3,
  MoreVertical
} from 'lucide-react';

interface DeviceManagementProps {
  userData: {
    parentName: string;
    childName: string;
  };
  userTier?: string;
  onClose?: () => void;
  onPaywallTrigger?: () => void;
}

interface ManagedDevice {
  id: string;
  name: string;
  type: 'ipad' | 'tablet' | 'phone';
  status: 'active' | 'inactive' | 'sleeping';
  lastSeen: string;
  battery: number;
  wifiStrength: number;
  screenTime: string;
  version: string;
  restrictions: {
    appAccess: boolean;
    internetAccess: boolean;
    timeRestrictions: boolean;
    contentFilter: boolean;
  };
  settings: {
    soundEnabled: boolean;
    notificationsEnabled: boolean;
    nightMode: boolean;
    dataSync: boolean;
  };
}

export function DeviceManagement({ 
  userData, 
  userTier = 'starter',
  onClose,
  onPaywallTrigger 
}: DeviceManagementProps) {
  const { caregiverShort, childShort } = useDisplayNames();
  const [showUrgentHelp, setShowUrgentHelp] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>('1');

  // Safe data extraction
  const safeUserData = userData || { parentName: 'Parent', childName: 'Child' };
  const safeChildName = safeUserData.childName || childShort || 'Child';
  const safeCaregiverName = safeUserData.parentName || caregiverShort || 'Parent';

  // Mock devices data
  const [devices, setDevices] = useState<ManagedDevice[]>([
    {
      id: '1',
      name: `${safeChildName}'s iPad`,
      type: 'ipad',
      status: 'active',
      lastSeen: 'Just now',
      battery: 78,
      wifiStrength: 85,
      screenTime: '2h 34m today',
      version: '2.1.3',
      restrictions: {
        appAccess: true,
        internetAccess: false,
        timeRestrictions: true,
        contentFilter: true
      },
      settings: {
        soundEnabled: true,
        notificationsEnabled: true,
        nightMode: false,
        dataSync: true
      }
    },
    {
      id: '2',
      name: 'Family Tablet',
      type: 'tablet',
      status: 'sleeping',
      lastSeen: '2 hours ago',
      battery: 45,
      wifiStrength: 92,
      screenTime: '45m today',
      version: '2.1.1',
      restrictions: {
        appAccess: true,
        internetAccess: true,
        timeRestrictions: false,
        contentFilter: true
      },
      settings: {
        soundEnabled: false,
        notificationsEnabled: false,
        nightMode: true,
        dataSync: true
      }
    }
  ]);

  const selectedDeviceData = devices.find(d => d.id === selectedDevice) || devices[0];

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
      case 'sleeping': return <Moon className="w-4 h-4 text-blue-600" />;
      default: return <Clock className="w-4 h-4 text-[#5A6B7A]" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-200';
      case 'inactive': return 'bg-red-50 text-red-700 border-red-200';
      case 'sleeping': return 'bg-[#EEF4F8] text-blue-700 border-[#C8DDE8]';
      default: return 'bg-[#F6FBFB] text-[#3A4A57] border-[#E8E4DF]';
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-600';
    if (level > 20) return 'text-amber-600';
    return 'text-red-600';
  };

  const getWifiIcon = (strength: number) => {
    return strength > 50 ? (
      <Wifi className="w-4 h-4 text-green-600" />
    ) : (
      <WifiOff className="w-4 h-4 text-red-600" />
    );
  };

  const updateDeviceSetting = (deviceId: string, category: 'restrictions' | 'settings', key: string, value: boolean) => {
    if (userTier === 'starter' && onPaywallTrigger) {
      onPaywallTrigger();
      return;
    }

    setDevices(prev => prev.map(device => 
      device.id === deviceId 
        ? { 
            ...device, 
            [category]: { 
              ...device[category], 
              [key]: value 
            } 
          }
        : device
    ));

    toast.success('Setting updated', {
      description: 'Device configuration has been saved.',
      duration: 2000,
    });
  };

  const handleRemoteAction = (action: string) => {
    if (userTier === 'starter' && onPaywallTrigger) {
      onPaywallTrigger();
      return;
    }

    toast.success(`${action} sent`, {
      description: `Remote ${action.toLowerCase()} command sent to ${selectedDeviceData.name}.`,
      duration: 3000,
    });
  };

  const handleRemoveDevice = (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    
    if (selectedDevice === deviceId && devices.length > 1) {
      setSelectedDevice(devices.find(d => d.id !== deviceId)?.id || null);
    }
    
    toast.success('Device removed', {
      description: 'The device has been unpaired and removed from your account.',
      duration: 3000,
    });
  };

  return (
    <div className="min-h-screen bg-mist dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-[#E8E4DF] dark:border-slate-700">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-xl text-[#132F43] dark:text-slate-100">Device Management</h1>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Manage {safeChildName}'s connected devices</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUrgentHelp(true)}
                className="text-[#5A6B7A] hover:text-[#132F43] dark:text-slate-400 dark:hover:text-slate-100"
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

      <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
          
          {/* Device List */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#132F43] dark:text-slate-100">
                Connected Devices
              </h2>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            </div>
            
            <div className="space-y-3">
              {devices.map((device) => (
                <Card 
                  key={device.id} 
                  className={`p-4 cursor-pointer transition-all duration-200 ${
                    selectedDevice === device.id 
                      ? 'ring-2 ring-blue-500 border-[#C8DDE8] dark:border-blue-800' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedDevice(device.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#EDF4F7] dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        {getDeviceIcon(device.type)}
                      </div>
                      <div>
                        <h3 className="font-medium text-[#132F43] dark:text-slate-100">{device.name}</h3>
                        <p className="text-sm text-[#5A6B7A] dark:text-slate-400">{device.lastSeen}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(device.status)}
                      <Badge className={getStatusColor(device.status)}>
                        {device.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Battery className={`w-4 h-4 ${getBatteryColor(device.battery)}`} />
                      <span className="text-[#5A6B7A] dark:text-slate-400">{device.battery}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getWifiIcon(device.wifiStrength)}
                      <span className="text-[#5A6B7A] dark:text-slate-400">{device.wifiStrength}%</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Tier Notice */}
            {userTier === 'starter' && (
              <Card className="mt-4 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                <div className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <div className="flex-1">
                      <h3 className="font-medium text-amber-900 dark:text-amber-100">
                        Limited Device Controls
                      </h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Upgrade to Core or Pro for full remote management capabilities.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={onPaywallTrigger}
                    className="w-full mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                    size="sm"
                  >
                    Upgrade Now
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Device Details */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4 sm:space-y-6">
            {selectedDeviceData && (
              <>
                {/* Device Overview */}
                <Card className="p-4 sm:p-5 md:p-6">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-16 h-16 bg-[#EDF4F7] dark:bg-slate-700 rounded-xl flex items-center justify-center">
                        {getDeviceIcon(selectedDeviceData.type)}
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-semibold text-[#132F43] dark:text-slate-100">
                          {selectedDeviceData.name}
                        </h2>
                        <p className="text-[#5A6B7A] dark:text-slate-400">
                          Version {selectedDeviceData.version} • {selectedDeviceData.screenTime}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Rename
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="text-center">
                      <div className={`text-xl sm:text-2xl font-bold ${getBatteryColor(selectedDeviceData.battery)}`}>
                        {selectedDeviceData.battery}%
                      </div>
                      <div className="text-sm text-[#5A6B7A] dark:text-slate-400">Battery</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-green-600">{selectedDeviceData.wifiStrength}%</div>
                      <div className="text-sm text-[#5A6B7A] dark:text-slate-400">WiFi Signal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-blue-600">{selectedDeviceData.screenTime.split(' ')[0]}</div>
                      <div className="text-sm text-[#5A6B7A] dark:text-slate-400">Screen Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-purple-600 capitalize">
                        {selectedDeviceData.status}
                      </div>
                      <div className="text-sm text-[#5A6B7A] dark:text-slate-400">Status</div>
                    </div>
                  </div>
                </Card>

                {/* Remote Actions */}
                <Card className="p-4 sm:p-5 md:p-6">
                  <h3 className="text-lg font-semibold text-[#132F43] dark:text-slate-100 mb-4">
                    Remote Actions
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleRemoteAction('Lock')}
                      className="h-auto p-4 flex-col gap-2"
                      disabled={userTier === 'starter'}
                    >
                      <Shield className="w-5 h-5" />
                      <span className="text-sm">Lock Device</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleRemoteAction('Refresh')}
                      className="h-auto p-4 flex-col gap-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      <span className="text-sm">Sync Data</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleRemoteAction('Update')}
                      className="h-auto p-4 flex-col gap-2"
                      disabled={userTier === 'starter'}
                    >
                      <Download className="w-5 h-5" />
                      <span className="text-sm">Update App</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleRemoteAction('Locate')}
                      className="h-auto p-4 flex-col gap-2"
                      disabled={userTier === 'starter'}
                    >
                      <Activity className="w-5 h-5" />
                      <span className="text-sm">Find Device</span>
                    </Button>
                  </div>
                </Card>

                {/* Device Settings */}
                <Card className="p-4 sm:p-5 md:p-6">
                  <h3 className="text-lg font-semibold text-[#132F43] dark:text-slate-100 mb-4">
                    Device Settings
                  </h3>
                  
                  <div className="space-y-3 sm:space-y-4 sm:space-y-6">
                    <div>
                      <h4 className="font-medium text-[#132F43] dark:text-slate-100 mb-3">General</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {selectedDeviceData.settings.soundEnabled ? (
                              <Volume2 className="w-4 h-4 text-[#5A6B7A]" />
                            ) : (
                              <VolumeX className="w-4 h-4 text-[#5A6B7A]" />
                            )}
                            <span className="text-[#132F43] dark:text-slate-100">Sound Enabled</span>
                          </div>
                          <Switch
                            checked={selectedDeviceData.settings.soundEnabled}
                            onCheckedChange={(checked) => 
                              updateDeviceSetting(selectedDeviceData.id, 'settings', 'soundEnabled', checked)
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-[#5A6B7A]" />
                            <span className="text-[#132F43] dark:text-slate-100">Notifications</span>
                          </div>
                          <Switch
                            checked={selectedDeviceData.settings.notificationsEnabled}
                            onCheckedChange={(checked) => 
                              updateDeviceSetting(selectedDeviceData.id, 'settings', 'notificationsEnabled', checked)
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {selectedDeviceData.settings.nightMode ? (
                              <Moon className="w-4 h-4 text-[#5A6B7A]" />
                            ) : (
                              <Sun className="w-4 h-4 text-[#5A6B7A]" />
                            )}
                            <span className="text-[#132F43] dark:text-slate-100">Night Mode</span>
                          </div>
                          <Switch
                            checked={selectedDeviceData.settings.nightMode}
                            onCheckedChange={(checked) => 
                              updateDeviceSetting(selectedDeviceData.id, 'settings', 'nightMode', checked)
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4 text-[#5A6B7A]" />
                            <span className="text-[#132F43] dark:text-slate-100">Auto Data Sync</span>
                          </div>
                          <Switch
                            checked={selectedDeviceData.settings.dataSync}
                            onCheckedChange={(checked) => 
                              updateDeviceSetting(selectedDeviceData.id, 'settings', 'dataSync', checked)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-[#132F43] dark:text-slate-100 mb-3">Parental Controls</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#5A6B7A]" />
                            <span className="text-[#132F43] dark:text-slate-100">App Access Control</span>
                            {userTier === 'starter' && <Badge variant="secondary" className="ml-2">Pro</Badge>}
                          </div>
                          <Switch
                            checked={selectedDeviceData.restrictions.appAccess}
                            onCheckedChange={(checked) => 
                              updateDeviceSetting(selectedDeviceData.id, 'restrictions', 'appAccess', checked)
                            }
                            disabled={userTier === 'starter'}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wifi className="w-4 h-4 text-[#5A6B7A]" />
                            <span className="text-[#132F43] dark:text-slate-100">Internet Access</span>
                            {userTier === 'starter' && <Badge variant="secondary" className="ml-2">Pro</Badge>}
                          </div>
                          <Switch
                            checked={selectedDeviceData.restrictions.internetAccess}
                            onCheckedChange={(checked) => 
                              updateDeviceSetting(selectedDeviceData.id, 'restrictions', 'internetAccess', checked)
                            }
                            disabled={userTier === 'starter'}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#5A6B7A]" />
                            <span className="text-[#132F43] dark:text-slate-100">Time Restrictions</span>
                            {userTier === 'starter' && <Badge variant="secondary" className="ml-2">Core</Badge>}
                          </div>
                          <Switch
                            checked={selectedDeviceData.restrictions.timeRestrictions}
                            onCheckedChange={(checked) => 
                              updateDeviceSetting(selectedDeviceData.id, 'restrictions', 'timeRestrictions', checked)
                            }
                            disabled={userTier === 'starter'}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-[#5A6B7A]" />
                            <span className="text-[#132F43] dark:text-slate-100">Content Filter</span>
                          </div>
                          <Switch
                            checked={selectedDeviceData.restrictions.contentFilter}
                            onCheckedChange={(checked) => 
                              updateDeviceSetting(selectedDeviceData.id, 'restrictions', 'contentFilter', checked)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Danger Zone */}
                <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-900/20">
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">
                    Danger Zone
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-900 dark:text-red-100">Remove Device</p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        This will unpair the device and remove all associated data.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => handleRemoveDevice(selectedDeviceData.id)}
                      className="ml-4"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
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