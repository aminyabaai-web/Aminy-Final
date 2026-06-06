// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Skylight Calendar Integration
 * Display-friendly routines and schedules for smart displays
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  Clock,
  Sun,
  Moon,
  Cloud,
  CheckCircle,
  Star,
  Heart,
  Image,
  ExternalLink,
  Settings,
  Link,
  Unlink,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface RoutineStep {
  id: string;
  name: string;
  icon: string;
  duration?: number;
  imageUrl?: string;
  completed?: boolean;
}

interface Routine {
  id: string;
  name: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  scheduledTime: string;
  steps: RoutineStep[];
  calendarId?: string;
}

interface SkylightIntegrationProps {
  userId?: string;
  routines?: Routine[];
  isConnected?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSyncRoutines?: (routines: Routine[]) => void;
}

// Sample routines for display
const SAMPLE_ROUTINES: Routine[] = [
  {
    id: 'morning',
    name: 'Morning Routine',
    timeOfDay: 'morning',
    scheduledTime: '7:00 AM',
    steps: [
      { id: '1', name: 'Wake up', icon: '☀️' },
      { id: '2', name: 'Use bathroom', icon: '🚽' },
      { id: '3', name: 'Brush teeth', icon: '🪥' },
      { id: '4', name: 'Get dressed', icon: '👕' },
      { id: '5', name: 'Eat breakfast', icon: '🥣' },
      { id: '6', name: 'Take medicine', icon: '💊' },
      { id: '7', name: 'Pack backpack', icon: '🎒' },
    ],
  },
  {
    id: 'afterschool',
    name: 'After School',
    timeOfDay: 'afternoon',
    scheduledTime: '3:30 PM',
    steps: [
      { id: '1', name: 'Snack time', icon: '🍎' },
      { id: '2', name: 'Calm down time', icon: '🧘' },
      { id: '3', name: 'Homework', icon: '📚' },
      { id: '4', name: 'Free play', icon: '🎮' },
    ],
  },
  {
    id: 'bedtime',
    name: 'Bedtime Routine',
    timeOfDay: 'evening',
    scheduledTime: '7:30 PM',
    steps: [
      { id: '1', name: 'Bath time', icon: '🛁' },
      { id: '2', name: 'Pajamas', icon: '👔' },
      { id: '3', name: 'Brush teeth', icon: '🪥' },
      { id: '4', name: 'Read story', icon: '📖' },
      { id: '5', name: 'Good night', icon: '🌙' },
    ],
  },
];

export function SkylightIntegration({
  userId,
  routines = SAMPLE_ROUTINES,
  isConnected = false,
  onConnect,
  onDisconnect,
  onSyncRoutines,
}: SkylightIntegrationProps) {
  const [connected, setConnected] = useState(isConnected);
  const [syncing, setSyncing] = useState(false);
  const [selectedRoutines, setSelectedRoutines] = useState<string[]>(
    routines.map((r) => r.id)
  );
  const [displayMode, setDisplayMode] = useState<'list' | 'preview'>('list');

  const handleConnect = async () => {
    // This would open OAuth flow to Skylight/Google Calendar
    toast.info('Opening Skylight connection...');
    setSyncing(true);

    // Simulate connection
    setTimeout(() => {
      setConnected(true);
      setSyncing(false);
      toast.success('Connected to Skylight!');
      onConnect?.();
    }, 2000);
  };

  const handleDisconnect = () => {
    setConnected(false);
    toast.info('Disconnected from Skylight');
    onDisconnect?.();
  };

  const handleSyncRoutines = async () => {
    setSyncing(true);

    // Simulate sync
    setTimeout(() => {
      setSyncing(false);
      toast.success('Routines synced to Skylight!');
      onSyncRoutines?.(routines.filter((r) => selectedRoutines.includes(r.id)));
    }, 1500);
  };

  const toggleRoutineSelection = (routineId: string) => {
    setSelectedRoutines((prev) =>
      prev.includes(routineId)
        ? prev.filter((id) => id !== routineId)
        : [...prev, routineId]
    );
  };

  const getTimeOfDayIcon = (timeOfDay: string) => {
    switch (timeOfDay) {
      case 'morning':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'afternoon':
        return <Cloud className="w-4 h-4 text-blue-500" />;
      case 'evening':
        return <Moon className="w-4 h-4 text-indigo-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#6B9080]" />
            Skylight Display
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Show visual schedules on your smart display
          </p>
        </div>
        {connected && (
          <Badge className="bg-green-100 text-green-700">Connected</Badge>
        )}
      </div>

      {/* Connection Status Card */}
      <Card
        className={`p-6 ${
          connected
            ? 'bg-gradient-to-r from-green-50 to-teal-50 border-green-200'
            : 'bg-gradient-to-r from-gray-50 to-slate-50'
        }`}
      >
        {!connected ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#F0EDE8] rounded-full flex items-center justify-center">
              <Link className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Connect to Skylight
            </h3>
            <p className="text-sm text-gray-600 mb-4 max-w-sm mx-auto">
              Display your child's visual schedules on Skylight Calendar or any
              smart display that supports Google Calendar.
            </p>
            <Button onClick={handleConnect} disabled={syncing}>
              {syncing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link className="w-4 h-4 mr-2" />
              )}
              Connect Skylight
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Skylight Connected</p>
                  <p className="text-sm text-gray-500">
                    {selectedRoutines.length} routines synced
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncRoutines}
                  disabled={syncing}
                >
                  {syncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Unlink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                variant={displayMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayMode('list')}
              >
                Manage Routines
              </Button>
              <Button
                variant={displayMode === 'preview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayMode('preview')}
              >
                Preview Display
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Routines List */}
      {connected && displayMode === 'list' && (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="font-semibold text-gray-900">
            Select Routines to Display
          </h3>
          {routines.map((routine) => (
            <Card
              key={routine.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedRoutines.includes(routine.id)
                  ? 'ring-2 ring-teal-500 bg-[#6B9080]/10/50'
                  : 'hover:bg-[#FAF7F2]'
              }`}
              onClick={() => toggleRoutineSelection(routine.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      routine.timeOfDay === 'morning'
                        ? 'bg-amber-100'
                        : routine.timeOfDay === 'afternoon'
                        ? 'bg-blue-100'
                        : 'bg-indigo-100'
                    }`}
                  >
                    {getTimeOfDayIcon(routine.timeOfDay)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{routine.name}</p>
                    <p className="text-sm text-gray-500">
                      {routine.scheduledTime} • {routine.steps.length} steps
                    </p>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedRoutines.includes(routine.id)
                      ? 'bg-primary border-[#6B9080]'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedRoutines.includes(routine.id) && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>

              {/* Steps preview */}
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {routine.steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex-shrink-0 px-3 py-1 bg-white rounded-full text-sm"
                  >
                    {step.icon} {step.name}
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Button
            onClick={handleSyncRoutines}
            disabled={syncing || selectedRoutines.length === 0}
            className="w-full"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync {selectedRoutines.length} Routine
                {selectedRoutines.length !== 1 ? 's' : ''} to Skylight
              </>
            )}
          </Button>
        </div>
      )}

      {/* Display Preview */}
      {connected && displayMode === 'preview' && (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="font-semibold text-gray-900">Display Preview</h3>
          <p className="text-sm text-gray-500">
            This is how your routines will appear on the Skylight display
          </p>

          {/* Mock Skylight Display */}
          <div className="bg-gray-900 rounded-2xl p-6 aspect-video relative overflow-hidden">
            {/* Simulated Skylight UI */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-purple-900/50" />

            <div className="relative z-10">
              {/* Time & Date */}
              <div className="text-white mb-4 sm:mb-6">
                <div className="text-4xl font-light">
                  {new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="text-white/60 text-sm">
                  {new Date().toLocaleDateString([], {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>

              {/* Current Routine Display */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sun className="w-5 h-5 text-amber-400" />
                  <span className="text-white font-medium">Morning Routine</span>
                  <Badge className="bg-amber-500/20 text-amber-300 text-xs">
                    In Progress
                  </Badge>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {SAMPLE_ROUTINES[0].steps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-3 rounded-lg text-center ${
                        index < 3
                          ? 'bg-green-500/30'
                          : index === 3
                          ? 'bg-white/20 ring-2 ring-white/50'
                          : 'bg-white/10'
                      }`}
                    >
                      <span className="text-2xl">{step.icon}</span>
                      <p className="text-white/80 text-xs mt-1 truncate">
                        {step.name}
                      </p>
                      {index < 3 && (
                        <CheckCircle className="w-4 h-4 text-green-400 mx-auto mt-1" />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Aminy branding */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 text-white/40 text-xs">
                <Heart className="w-3 h-3" />
                <span>Powered by Aminy</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Settings className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 mb-1">
              Setting up your display
            </h4>
            <p className="text-sm text-blue-700 mb-2">
              Aminy syncs with Google Calendar, which Skylight and other smart
              displays can connect to. Your visual schedules will automatically
              appear at the scheduled times.
            </p>
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600 text-sm"
            >
              View setup guide
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default SkylightIntegration;
