/**
 * ConnectionQualityIndicator
 *
 * Displays a real-time connection quality badge during a video call.
 * Shows a colour-coded icon (green/yellow/red) with optional expanded
 * stats (bitrate, packet loss) when tapped.
 *
 * Powered by the useConnectionQuality hook.
 */

import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  SignalHigh,
  SignalMedium,
  SignalLow,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ConnectionQuality, NetworkStats } from '../../hooks/useConnectionQuality';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConnectionQualityIndicatorProps {
  quality: ConnectionQuality;
  stats: NetworkStats | null;
  /** Show as compact pill (default) or expanded card */
  variant?: 'pill' | 'card';
  /** Additional CSS class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function qualityConfig(quality: ConnectionQuality) {
  switch (quality) {
    case 'good':
      return {
        label: 'Strong',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
        Icon: SignalHigh,
      };
    case 'fair':
      return {
        label: 'Fair',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
        Icon: SignalMedium,
      };
    case 'poor':
      return {
        label: 'Weak',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        Icon: SignalLow,
      };
    default:
      return {
        label: 'Checking...',
        color: 'text-white/60',
        bgColor: 'bg-white/10',
        borderColor: 'border-white/10',
        Icon: Wifi,
      };
  }
}

function formatBps(bps: number): string {
  if (bps >= 1_000_000) {
    return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  }
  if (bps >= 1_000) {
    return `${(bps / 1_000).toFixed(0)} kbps`;
  }
  return `${bps} bps`;
}

function formatPacketLoss(loss: number): string {
  return `${(loss * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConnectionQualityIndicator({
  quality,
  stats,
  variant = 'pill',
  className = '',
}: ConnectionQualityIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const config = qualityConfig(quality);
  const { Icon, label, color, bgColor, borderColor } = config;

  if (variant === 'pill') {
    return (
      <div className={`relative ${className}`}>
        {/* Compact pill */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${bgColor} border ${borderColor} transition-colors`}
          aria-label={`Connection quality: ${label}`}
        >
          <Icon size={14} className={color} />
          <span className={`text-xs font-medium ${color}`}>{label}</span>
          {expanded ? (
            <ChevronUp size={12} className={color} />
          ) : (
            <ChevronDown size={12} className={color} />
          )}
        </button>

        {/* Expanded stats dropdown */}
        {expanded && stats && (
          <div className="absolute top-full mt-2 right-0 w-64 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl p-3 shadow-xl z-50">
            <div className="flex items-center gap-2 mb-3">
              <Icon size={16} className={color} />
              <span className={`text-sm font-semibold ${color}`}>
                {label} Connection
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Video */}
              <div className="flex justify-between text-white/70">
                <span>Video send</span>
                <span className="font-mono text-white/90">{formatBps(stats.videoSendBps)}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Video receive</span>
                <span className="font-mono text-white/90">{formatBps(stats.videoRecvBps)}</span>
              </div>

              {/* Audio */}
              <div className="flex justify-between text-white/70">
                <span>Audio send</span>
                <span className="font-mono text-white/90">{formatBps(stats.audioSendBps)}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Audio receive</span>
                <span className="font-mono text-white/90">{formatBps(stats.audioRecvBps)}</span>
              </div>

              {/* Separator */}
              <div className="border-t border-white/10 my-1" />

              {/* Packet loss */}
              <div className="flex justify-between text-white/70">
                <span>Video packet loss</span>
                <span className={`font-mono ${
                  Math.max(stats.videoSendPacketLoss, stats.videoRecvPacketLoss) > 0.05
                    ? 'text-red-400'
                    : Math.max(stats.videoSendPacketLoss, stats.videoRecvPacketLoss) > 0.02
                      ? 'text-yellow-400'
                      : 'text-green-400'
                }`}>
                  {formatPacketLoss(Math.max(stats.videoSendPacketLoss, stats.videoRecvPacketLoss))}
                </span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Audio packet loss</span>
                <span className={`font-mono ${
                  Math.max(stats.audioSendPacketLoss, stats.audioRecvPacketLoss) > 0.05
                    ? 'text-red-400'
                    : Math.max(stats.audioSendPacketLoss, stats.audioRecvPacketLoss) > 0.02
                      ? 'text-yellow-400'
                      : 'text-green-400'
                }`}>
                  {formatPacketLoss(Math.max(stats.audioSendPacketLoss, stats.audioRecvPacketLoss))}
                </span>
              </div>
            </div>

            {/* Tip for poor quality */}
            {quality === 'poor' && (
              <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-xs text-red-300">
                  Try moving closer to your router or switch to a wired connection.
                  Consider turning off your camera to improve audio quality.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Card variant (for pre-call / waiting room)
  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} className={color} />
          <div>
            <p className={`text-sm font-medium ${color}`}>{label} Connection</p>
            {stats && (
              <p className="text-xs text-white/50 mt-0.5">
                {formatBps(Math.max(stats.videoSendBps, stats.videoRecvBps))} video &middot;{' '}
                {formatPacketLoss(
                  Math.max(stats.videoSendPacketLoss, stats.videoRecvPacketLoss),
                )}{' '}
                loss
              </p>
            )}
          </div>
        </div>
        {quality === 'poor' && <WifiOff size={16} className="text-red-400" />}
      </div>
    </div>
  );
}

export default ConnectionQualityIndicator;
