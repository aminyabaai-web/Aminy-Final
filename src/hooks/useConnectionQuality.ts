// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useConnectionQuality Hook
 *
 * Monitors Daily.co network statistics during an active call and exposes
 * a normalised quality level (good / fair / poor) plus raw metrics.
 *
 * Usage:
 *   const { quality, stats } = useConnectionQuality(callObject);
 *
 * The hook polls `getNetworkStats()` every 3 seconds and derives a
 * composite score from video bitrate, audio bitrate, and packet-loss.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { DailyCallObject, DailyNetworkStats } from '../types/video';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionQuality = 'good' | 'fair' | 'poor' | 'unknown';

export interface NetworkStats {
  /** Video send bits per second */
  videoSendBps: number;
  /** Video receive bits per second */
  videoRecvBps: number;
  /** Audio send bits per second */
  audioSendBps: number;
  /** Audio receive bits per second */
  audioRecvBps: number;
  /** Video send packet loss (0-1) */
  videoSendPacketLoss: number;
  /** Video receive packet loss (0-1) */
  videoRecvPacketLoss: number;
  /** Audio send packet loss (0-1) */
  audioSendPacketLoss: number;
  /** Audio receive packet loss (0-1) */
  audioRecvPacketLoss: number;
  /** Timestamp of last measurement */
  timestamp: number;
}

export interface ConnectionQualityResult {
  /** Normalised quality level */
  quality: ConnectionQuality;
  /** Raw network stats snapshot */
  stats: NetworkStats | null;
  /** Whether the hook is actively polling */
  isMonitoring: boolean;
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/**
 * Quality thresholds based on Daily.co recommended values.
 *
 * Good  – video bitrate >= 500 kbps, packet loss < 2%
 * Fair  – video bitrate >= 150 kbps, packet loss < 5%
 * Poor  – anything below fair
 */
const THRESHOLDS = {
  good: {
    minVideoBps: 500_000,
    maxPacketLoss: 0.02,
  },
  fair: {
    minVideoBps: 150_000,
    maxPacketLoss: 0.05,
  },
} as const;

const POLL_INTERVAL_MS = 3_000;

// ---------------------------------------------------------------------------
// Quality derivation
// ---------------------------------------------------------------------------

function deriveQuality(stats: NetworkStats): ConnectionQuality {
  const combinedBps = Math.max(stats.videoSendBps, stats.videoRecvBps);
  const worstPacketLoss = Math.max(
    stats.videoSendPacketLoss,
    stats.videoRecvPacketLoss,
    stats.audioSendPacketLoss,
    stats.audioRecvPacketLoss,
  );

  if (
    combinedBps >= THRESHOLDS.good.minVideoBps &&
    worstPacketLoss <= THRESHOLDS.good.maxPacketLoss
  ) {
    return 'good';
  }

  if (
    combinedBps >= THRESHOLDS.fair.minVideoBps &&
    worstPacketLoss <= THRESHOLDS.fair.maxPacketLoss
  ) {
    return 'fair';
  }

  return 'poor';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConnectionQuality(
  callObject: DailyCallObject | null,
): ConnectionQualityResult {
  const [quality, setQuality] = useState<ConnectionQuality>('unknown');
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (!callObject) return;

    try {
      const raw: DailyNetworkStats = await callObject.getNetworkStats();
      const latest = raw?.stats?.latest;
      if (!latest) return;

      const snapshot: NetworkStats = {
        videoSendBps: latest.videoSendBitsPerSecond ?? 0,
        videoRecvBps: latest.videoRecvBitsPerSecond ?? 0,
        audioSendBps: latest.audioSendBitsPerSecond ?? 0,
        audioRecvBps: latest.audioRecvBitsPerSecond ?? 0,
        videoSendPacketLoss: latest.videoSendPacketLoss ?? 0,
        videoRecvPacketLoss: latest.videoRecvPacketLoss ?? 0,
        audioSendPacketLoss: latest.audioSendPacketLoss ?? 0,
        audioRecvPacketLoss: latest.audioRecvPacketLoss ?? 0,
        timestamp: latest.timestamp ?? Date.now(),
      };

      setStats(snapshot);
      setQuality(deriveQuality(snapshot));
    } catch (err) {
      // getNetworkStats can throw if the call is not yet connected
      console.warn('[useConnectionQuality] poll error:', err);
    }
  }, [callObject]);

  useEffect(() => {
    if (!callObject) {
      setIsMonitoring(false);
      setQuality('unknown');
      setStats(null);
      return;
    }

    setIsMonitoring(true);

    // Initial poll
    poll();

    // Start interval
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsMonitoring(false);
    };
  }, [callObject, poll]);

  return { quality, stats, isMonitoring };
}

export default useConnectionQuality;
