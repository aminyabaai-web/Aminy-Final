// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Health Data Integration
 *
 * Connects to Apple Health (iOS) and Google Fit (Android) to automatically
 * import sleep data. This creates powerful correlations between sleep quality
 * and behavior that make the app indispensable.
 *
 * "Last night was rough (4.5 hours) - expect a harder day. Here's how to help..."
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Moon,
  Activity,
  Smartphone,
  Check,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Shield,
  Zap,
  Clock,
  Sun,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { supabase } from '../utils/supabase/client';

interface SleepData {
  date: string;
  totalHours: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  bedtime: string;
  wakeTime: string;
  interruptions: number;
  deepSleepPercent?: number;
}

interface HealthDataIntegrationProps {
  userId: string;
  childId: string;
  childName: string;
  onSleepDataUpdate?: (data: SleepData) => void;
}

// Detect platform
function getPlatform(): 'ios' | 'android' | 'web' {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  return 'web';
}

// Quality from hours
function getSleepQuality(hours: number, age: number): SleepData['quality'] {
  // Recommended sleep by age (simplified)
  const recommended = age <= 5 ? 11 : age <= 12 ? 10 : 9;
  const ratio = hours / recommended;

  if (ratio >= 0.95) return 'excellent';
  if (ratio >= 0.8) return 'good';
  if (ratio >= 0.6) return 'fair';
  return 'poor';
}

// Generate insight based on sleep data
function generateSleepInsight(data: SleepData, childName: string): string {
  const { totalHours, quality, interruptions } = data;

  if (quality === 'poor') {
    return `${childName} only got ${totalHours.toFixed(1)} hours of sleep last night. Today might be tougher than usual - dysregulation, meltdowns, and sensory sensitivity are more likely. Build in extra transition time and keep demands low if possible.`;
  }

  if (quality === 'fair') {
    return `${totalHours.toFixed(1)} hours isn't ideal for ${childName}. Watch for signs of fatigue this afternoon - an earlier quiet time or snack might help prevent a late-day crash.`;
  }

  if (quality === 'excellent') {
    if (interruptions === 0) {
      return `Great news! ${childName} slept ${totalHours.toFixed(1)} hours with no interruptions. This is a good day to try something slightly challenging - the extra rest means better regulation.`;
    }
    return `Solid sleep for ${childName} (${totalHours.toFixed(1)} hours). Energy and regulation should be good today.`;
  }

  return `${childName} got ${totalHours.toFixed(1)} hours - pretty decent. No major adjustments needed, but keep an eye on the afternoon slump.`;
}

export function HealthDataIntegration({
  userId,
  childId,
  childName,
  onSleepDataUpdate,
}: HealthDataIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [recentSleep, setRecentSleep] = useState<SleepData | null>(null);
  const [weeklyAverage, setWeeklyAverage] = useState<number | null>(null);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [showDetails, setShowDetails] = useState(false);

  const platform = getPlatform();

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, [userId]);

  async function checkConnectionStatus() {
    try {
      const { data } = await supabase
        .from('health_integrations')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      const integration = Array.isArray(data) ? data[0] : null;
      if (integration && integration.is_connected) {
        setIsConnected(true);
        setLastSync(integration.last_sync ? new Date(integration.last_sync) : null);
        loadRecentSleepData();
      }
    } catch (error) {
      // Not connected yet
    }
  }

  async function loadRecentSleepData() {
    try {
      const { data: sleepRecords } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('child_id', childId)
        .order('date', { ascending: false })
        .limit(7);

      if (sleepRecords && sleepRecords.length > 0) {
        // Most recent
        const latest = sleepRecords[0];
        setRecentSleep({
          date: latest.date,
          totalHours: latest.total_hours,
          quality: latest.quality,
          bedtime: latest.bedtime,
          wakeTime: latest.wake_time,
          interruptions: latest.interruptions || 0,
          deepSleepPercent: latest.deep_sleep_percent,
        });

        // Weekly average
        const avgHours = sleepRecords.reduce((sum, r) => sum + r.total_hours, 0) / sleepRecords.length;
        setWeeklyAverage(avgHours);

        // Trend (compare last 3 to previous 3)
        if (sleepRecords.length >= 6) {
          const recent3 = sleepRecords.slice(0, 3).reduce((sum, r) => sum + r.total_hours, 0) / 3;
          const previous3 = sleepRecords.slice(3, 6).reduce((sum, r) => sum + r.total_hours, 0) / 3;
          setTrend(recent3 > previous3 + 0.3 ? 'up' : recent3 < previous3 - 0.3 ? 'down' : 'stable');
        }
      }
    } catch (error) {
      console.error('Error loading sleep data:', error);
    }
  }

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);

    try {
      if (platform === 'ios') {
        // In a real app, this would use HealthKit via Capacitor/native bridge
        // For now, we'll simulate the connection
        await simulateHealthKitConnection();
      } else if (platform === 'android') {
        // Would use Google Fit API
        await simulateGoogleFitConnection();
      } else {
        // Web - manual entry or wearable API
        await simulateManualSetup();
      }

      // Save connection status
      await supabase.from('health_integrations').upsert({
        user_id: userId,
        platform,
        is_connected: true,
        last_sync: new Date().toISOString(),
        permissions: ['sleep'],
      });

      setIsConnected(true);
      setLastSync(new Date());

      // Load initial data
      await loadRecentSleepData();
    } catch (error) {
      console.error('Connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [platform, userId]);

  async function simulateHealthKitConnection(): Promise<void> {
    // Simulate HealthKit authorization flow
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In production, would request HealthKit permissions:
    // HKHealthStore.requestAuthorization(toRead: [.sleepAnalysis], toWrite: [])
  }

  async function simulateGoogleFitConnection(): Promise<void> {
    // Simulate Google Fit OAuth flow
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In production, would use Google Sign-In + Fitness API:
    // gapi.client.fitness.users.dataSources.datasets.get(...)
  }

  async function simulateManualSetup(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const handleSync = useCallback(async () => {
    setIsConnecting(true);
    try {
      // In production, would fetch latest data from health platform
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastSync(new Date());
      await loadRecentSleepData();
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Save manual sleep entry
  async function handleManualEntry(hours: number, quality: SleepData['quality']) {
    const now = new Date();
    const sleepData: SleepData = {
      date: now.toISOString().split('T')[0],
      totalHours: hours,
      quality,
      bedtime: '20:30',
      wakeTime: '06:30',
      interruptions: quality === 'poor' ? 2 : quality === 'fair' ? 1 : 0,
    };

    await supabase.from('sleep_records').insert({
      child_id: childId,
      user_id: userId,
      date: sleepData.date,
      total_hours: sleepData.totalHours,
      quality: sleepData.quality,
      bedtime: sleepData.bedtime,
      wake_time: sleepData.wakeTime,
      interruptions: sleepData.interruptions,
      source: 'manual',
    });

    setRecentSleep(sleepData);
    onSleepDataUpdate?.(sleepData);
  }

  // Not connected - show setup prompt
  if (!isConnected) {
    return (
      <Card className="overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Moon className="w-5 h-5 text-[#6B9080]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#132F43]">Sleep Insights</h3>
              <p className="text-sm text-[#5A6B7A]">Connect to see how sleep affects behavior</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3 text-sm">
            <Zap className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[#5A6B7A]">
              <strong>Did you know?</strong> Sleep quality directly impacts meltdowns,
              focus, and regulation. We'll show you the patterns.
            </p>
          </div>

          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-indigo-500 hover:bg-primary text-white"
          >
            {isConnecting ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Connecting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {platform === 'ios' ? (
                  <>
                    <Smartphone className="w-4 h-4" />
                    Connect Apple Health
                  </>
                ) : platform === 'android' ? (
                  <>
                    <Activity className="w-4 h-4" />
                    Connect Google Fit
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4" />
                    Set Up Sleep Tracking
                  </>
                )}
              </span>
            )}
          </Button>

          <div className="flex items-center gap-2 text-sm text-[#5A6B7A] justify-center">
            <Shield className="w-3 h-3" />
            <span>We only read sleep data. Never shared.</span>
          </div>
        </div>
      </Card>
    );
  }

  // Connected - show sleep insights
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-4 text-left bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Moon className="w-5 h-5 text-[#6B9080]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#132F43]">Last Night's Sleep</h3>
              {recentSleep ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-lg font-bold ${
                    recentSleep.quality === 'excellent' ? 'text-green-600' :
                    recentSleep.quality === 'good' ? 'text-[#6B9080]' :
                    recentSleep.quality === 'fair' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {recentSleep.totalHours.toFixed(1)}h
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    recentSleep.quality === 'excellent' ? 'bg-green-100 text-green-700' :
                    recentSleep.quality === 'good' ? 'bg-[#6B9080]/10 text-[#6B9080]' :
                    recentSleep.quality === 'fair' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {recentSleep.quality}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-[#5A6B7A]">Loading...</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {trend !== 'stable' && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{trend === 'up' ? 'Improving' : 'Declining'}</span>
              </div>
            )}
            <ChevronRight className={`w-5 h-5 text-[#8A9BA8] transition-transform ${showDetails ? 'rotate-90' : ''}`} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 border-t border-[#E8E4DF]">
              {/* Sleep insight */}
              {recentSleep && (
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <p className="text-sm text-indigo-900 leading-relaxed">
                    {generateSleepInsight(recentSleep, childName)}
                  </p>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-[#F6FBFB] rounded-xl">
                  <Clock className="w-4 h-4 text-[#8A9BA8] mx-auto mb-1" />
                  <p className="text-sm text-[#5A6B7A]">Bedtime</p>
                  <p className="font-semibold text-[#132F43]">{recentSleep?.bedtime || '--'}</p>
                </div>
                <div className="text-center p-3 bg-[#F6FBFB] rounded-xl">
                  <Sun className="w-4 h-4 text-[#8A9BA8] mx-auto mb-1" />
                  <p className="text-sm text-[#5A6B7A]">Wake</p>
                  <p className="font-semibold text-[#132F43]">{recentSleep?.wakeTime || '--'}</p>
                </div>
                <div className="text-center p-3 bg-[#F6FBFB] rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-[#8A9BA8] mx-auto mb-1" />
                  <p className="text-sm text-[#5A6B7A]">Wakeups</p>
                  <p className="font-semibold text-[#132F43]">{recentSleep?.interruptions ?? '--'}</p>
                </div>
              </div>

              {/* Weekly average */}
              {weeklyAverage && (
                <div className="flex items-center justify-between p-3 bg-[#F6FBFB] rounded-xl">
                  <span className="text-sm text-[#5A6B7A]">7-Day Average</span>
                  <span className="font-semibold text-[#132F43]">{weeklyAverage.toFixed(1)} hours</span>
                </div>
              )}

              {/* Sync button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-[#5A6B7A]">
                  Last sync: {lastSync?.toLocaleTimeString() || 'Never'}
                </span>
                <button
                  onClick={handleSync}
                  disabled={isConnecting}
                  className="flex items-center gap-1 text-sm text-[#6B9080] hover:text-indigo-700"
                >
                  <RefreshCw className={`w-3 h-3 ${isConnecting ? 'animate-spin' : ''}`} />
                  Sync now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/**
 * Compact sleep badge for dashboard header
 */
export function SleepBadge({ hours, quality }: { hours: number; quality: SleepData['quality'] }) {
  const color = quality === 'excellent' ? 'bg-green-100 text-green-700' :
                quality === 'good' ? 'bg-[#6B9080]/10 text-[#6B9080]' :
                quality === 'fair' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700';

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Moon className="w-3 h-3" />
      <span>{hours.toFixed(1)}h</span>
    </div>
  );
}

export default HealthDataIntegration;
