// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Telehealth Quality Monitor & Reconnection Manager
 *
 * Provides real-time WebRTC connection quality monitoring and automatic
 * reconnection handling for telehealth video sessions.
 *
 * ConnectionQualityMonitor:
 *   - Polls RTCPeerConnection getStats() for quality metrics
 *   - Computes a 1-5 quality score from packet loss, jitter, bitrate
 *   - Fires quality change events for UI updates
 *   - Suggests user-facing quality improvements
 *
 * ReconnectionManager:
 *   - Classifies disconnect reasons
 *   - Implements exponential backoff reconnection
 *   - Exposes state for reconnection UI overlays
 *
 * Designed to work with Daily.co (primary) and raw RTCPeerConnection.
 */

// ============================================================================
// Types
// ============================================================================

export type QualityScore = 1 | 2 | 3 | 4 | 5;

export type QualityLabel = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';

export type ReconnectionState = 'connected' | 'reconnecting' | 'failed';

export type DisconnectReason =
  | 'network_change'
  | 'timeout'
  | 'server_error'
  | 'peer_left'
  | 'ice_failure'
  | 'unknown';

export interface NetworkStats {
  /** Video send bitrate in kbps */
  videoBitrateKbps: number;
  /** Audio send bitrate in kbps */
  audioBitrateKbps: number;
  /** Round-trip time in milliseconds */
  roundTripTimeMs: number;
  /** Jitter in milliseconds */
  jitterMs: number;
  /** Packet loss percentage (0-100) */
  packetLossPercent: number;
  /** Available outgoing bandwidth in kbps (estimate) */
  availableBandwidthKbps: number;
  /** Frames per second (video) */
  framesPerSecond: number;
  /** Resolution width */
  resolutionWidth: number;
  /** Resolution height */
  resolutionHeight: number;
  /** Timestamp of measurement */
  timestamp: number;
}

export type QualityChangeCallback = (
  score: QualityScore,
  label: QualityLabel,
  stats: NetworkStats,
) => void;

export type ReconnectionStateCallback = (
  state: ReconnectionState,
  attempt: number,
  maxAttempts: number,
) => void;

// ============================================================================
// Quality Score Thresholds
// ============================================================================

const QUALITY_THRESHOLDS = {
  excellent: { minBitrateKbps: 1500, maxPacketLoss: 1, maxJitter: 15, maxRtt: 100 },
  good: { minBitrateKbps: 800, maxPacketLoss: 2, maxJitter: 30, maxRtt: 200 },
  fair: { minBitrateKbps: 300, maxPacketLoss: 5, maxJitter: 50, maxRtt: 350 },
  poor: { minBitrateKbps: 100, maxPacketLoss: 10, maxJitter: 80, maxRtt: 500 },
  // Anything below poor = critical (score 1)
} as const;

const POLL_INTERVAL_MS = 3000;
const SCORE_HISTORY_SIZE = 5; // Average over last 5 readings for stability

// ============================================================================
// ConnectionQualityMonitor
// ============================================================================

export class ConnectionQualityMonitor {
  private peerConnection: RTCPeerConnection | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: QualityChangeCallback[] = [];
  private currentScore: QualityScore = 3;
  private currentStats: NetworkStats | null = null;
  private scoreHistory: QualityScore[] = [];
  private prevBytesSent = 0;
  private prevBytesReceived = 0;
  private prevTimestamp = 0;
  private isMonitoring = false;

  /**
   * Start monitoring a WebRTC peer connection.
   *
   * @param peerConnection - The RTCPeerConnection to monitor
   */
  startMonitoring(peerConnection: RTCPeerConnection): void {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }

    this.peerConnection = peerConnection;
    this.isMonitoring = true;
    this.prevBytesSent = 0;
    this.prevBytesReceived = 0;
    this.prevTimestamp = Date.now();
    this.scoreHistory = [];

    // Initial poll
    this.pollStats();

    // Start polling
    this.pollTimer = setInterval(() => this.pollStats(), POLL_INTERVAL_MS);

    console.log('[QualityMonitor] Started monitoring connection');
  }

  /**
   * Stop monitoring the connection.
   */
  stopMonitoring(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isMonitoring = false;
    this.peerConnection = null;
    this.scoreHistory = [];
    console.log('[QualityMonitor] Stopped monitoring');
  }

  /**
   * Get the current quality score (1-5).
   * 5 = Excellent, 4 = Good, 3 = Fair, 2 = Poor, 1 = Critical
   */
  getQualityScore(): QualityScore {
    return this.currentScore;
  }

  /**
   * Get the human-readable quality label.
   */
  getQualityLabel(): QualityLabel {
    return scoreToLabel(this.currentScore);
  }

  /**
   * Register a callback for quality change events.
   * Fires whenever the smoothed quality score changes.
   *
   * @param callback - Function called with (score, label, stats)
   * @returns Unsubscribe function
   */
  onQualityChange(callback: QualityChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Get current network statistics snapshot.
   */
  getNetworkStats(): NetworkStats | null {
    return this.currentStats;
  }

  /**
   * Suggest a quality improvement action based on current stats.
   */
  suggestQualityImprovement(): string | null {
    if (!this.currentStats) return null;
    const stats = this.currentStats;

    if (stats.packetLossPercent > 10) {
      return 'Your connection is unstable. Try moving closer to your Wi-Fi router or switching to a wired connection.';
    }

    if (stats.videoBitrateKbps < 200 && stats.videoBitrateKbps > 0) {
      return 'Low bandwidth detected. Consider turning off your camera to improve audio quality.';
    }

    if (stats.roundTripTimeMs > 400) {
      return 'High latency detected. Close other apps and browser tabs that may be using bandwidth.';
    }

    if (stats.jitterMs > 60) {
      return 'Unstable connection. Try closing other devices on your network or pausing downloads.';
    }

    if (stats.framesPerSecond < 10 && stats.framesPerSecond > 0) {
      return 'Low frame rate. Reducing video quality or turning off screen sharing may help.';
    }

    if (this.currentScore <= 2) {
      return 'Poor connection quality. If issues persist, try reconnecting or switching to audio-only mode.';
    }

    return null;
  }

  /** Whether monitoring is active */
  get monitoring(): boolean {
    return this.isMonitoring;
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private async pollStats(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const report = await this.peerConnection.getStats();
      const stats = this.extractStats(report);
      if (!stats) return;

      this.currentStats = stats;

      // Calculate raw score
      const rawScore = this.calculateScore(stats);

      // Add to history and compute smoothed score
      this.scoreHistory.push(rawScore);
      if (this.scoreHistory.length > SCORE_HISTORY_SIZE) {
        this.scoreHistory.shift();
      }

      const smoothedScore = this.getSmoothedScore();
      const prevScore = this.currentScore;
      this.currentScore = smoothedScore;

      // Fire event if score changed
      if (smoothedScore !== prevScore) {
        const label = scoreToLabel(smoothedScore);
        for (const listener of this.listeners) {
          try {
            listener(smoothedScore, label, stats);
          } catch (err) {
            console.warn('[QualityMonitor] Listener error:', err);
          }
        }
      }
    } catch (err) {
      console.warn('[QualityMonitor] Stats poll error:', err);
    }
  }

  private extractStats(report: RTCStatsReport): NetworkStats | null {
    let videoBitrateKbps = 0;
    let audioBitrateKbps = 0;
    let roundTripTimeMs = 0;
    let jitterMs = 0;
    let packetLossPercent = 0;
    let framesPerSecond = 0;
    let resolutionWidth = 0;
    let resolutionHeight = 0;
    let totalBytesSent = 0;
    let totalPacketsSent = 0;
    let totalPacketsLost = 0;

    const now = Date.now();
    const elapsed = (now - this.prevTimestamp) / 1000; // seconds

    report.forEach((stat) => {
      // Candidate pair for RTT
      if (stat.type === 'candidate-pair' && stat.nominated) {
        roundTripTimeMs = (stat.currentRoundTripTime ?? 0) * 1000;
      }

      // Outbound RTP for bitrate calculation
      if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
        totalBytesSent += stat.bytesSent ?? 0;
        framesPerSecond = stat.framesPerSecond ?? 0;
        if (stat.frameWidth) resolutionWidth = stat.frameWidth;
        if (stat.frameHeight) resolutionHeight = stat.frameHeight;
      }

      if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
        const audioBytes = stat.bytesSent ?? 0;
        if (elapsed > 0 && this.prevBytesSent > 0) {
          audioBitrateKbps = Math.round(
            ((audioBytes - (this.prevBytesSent * 0.1)) * 8) / elapsed / 1000,
          );
          if (audioBitrateKbps < 0) audioBitrateKbps = 0;
        }
      }

      // Inbound RTP for packet loss and jitter
      if (stat.type === 'inbound-rtp') {
        totalPacketsSent += stat.packetsReceived ?? 0;
        totalPacketsLost += stat.packetsLost ?? 0;
        if (stat.jitter) {
          jitterMs = Math.max(jitterMs, stat.jitter * 1000);
        }
      }
    });

    // Calculate video bitrate
    if (elapsed > 0 && this.prevBytesSent > 0) {
      videoBitrateKbps = Math.round(
        ((totalBytesSent - this.prevBytesSent) * 8) / elapsed / 1000,
      );
      if (videoBitrateKbps < 0) videoBitrateKbps = 0;
    }

    // Calculate packet loss
    if (totalPacketsSent + totalPacketsLost > 0) {
      packetLossPercent = (totalPacketsLost / (totalPacketsSent + totalPacketsLost)) * 100;
    }

    // Save for next delta calculation
    this.prevBytesSent = totalBytesSent;
    this.prevTimestamp = now;

    // Estimate available bandwidth (rough: 2x current send rate)
    const availableBandwidthKbps = videoBitrateKbps > 0
      ? Math.round(videoBitrateKbps * 2)
      : 0;

    return {
      videoBitrateKbps: Math.max(0, videoBitrateKbps),
      audioBitrateKbps: Math.max(0, audioBitrateKbps),
      roundTripTimeMs: Math.round(roundTripTimeMs),
      jitterMs: Math.round(jitterMs),
      packetLossPercent: Math.round(packetLossPercent * 100) / 100,
      availableBandwidthKbps,
      framesPerSecond,
      resolutionWidth,
      resolutionHeight,
      timestamp: now,
    };
  }

  private calculateScore(stats: NetworkStats): QualityScore {
    const { videoBitrateKbps, packetLossPercent, jitterMs, roundTripTimeMs } = stats;

    if (
      videoBitrateKbps >= QUALITY_THRESHOLDS.excellent.minBitrateKbps &&
      packetLossPercent <= QUALITY_THRESHOLDS.excellent.maxPacketLoss &&
      jitterMs <= QUALITY_THRESHOLDS.excellent.maxJitter &&
      roundTripTimeMs <= QUALITY_THRESHOLDS.excellent.maxRtt
    ) {
      return 5;
    }

    if (
      videoBitrateKbps >= QUALITY_THRESHOLDS.good.minBitrateKbps &&
      packetLossPercent <= QUALITY_THRESHOLDS.good.maxPacketLoss &&
      jitterMs <= QUALITY_THRESHOLDS.good.maxJitter &&
      roundTripTimeMs <= QUALITY_THRESHOLDS.good.maxRtt
    ) {
      return 4;
    }

    if (
      videoBitrateKbps >= QUALITY_THRESHOLDS.fair.minBitrateKbps &&
      packetLossPercent <= QUALITY_THRESHOLDS.fair.maxPacketLoss &&
      jitterMs <= QUALITY_THRESHOLDS.fair.maxJitter &&
      roundTripTimeMs <= QUALITY_THRESHOLDS.fair.maxRtt
    ) {
      return 3;
    }

    if (
      videoBitrateKbps >= QUALITY_THRESHOLDS.poor.minBitrateKbps &&
      packetLossPercent <= QUALITY_THRESHOLDS.poor.maxPacketLoss &&
      jitterMs <= QUALITY_THRESHOLDS.poor.maxJitter &&
      roundTripTimeMs <= QUALITY_THRESHOLDS.poor.maxRtt
    ) {
      return 2;
    }

    return 1;
  }

  private getSmoothedScore(): QualityScore {
    if (this.scoreHistory.length === 0) return 3;
    const sum = this.scoreHistory.reduce((a, b) => a + b, 0);
    const avg = sum / this.scoreHistory.length;
    return Math.round(avg) as QualityScore;
  }
}

// ============================================================================
// ReconnectionManager
// ============================================================================

const DEFAULT_MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

export class ReconnectionManager {
  private state: ReconnectionState = 'connected';
  private attempt = 0;
  private maxRetries: number;
  private listeners: ReconnectionStateCallback[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectFn: (() => Promise<boolean>) | null = null;

  constructor(maxRetries = DEFAULT_MAX_RETRIES) {
    this.maxRetries = maxRetries;
  }

  /**
   * Handle a disconnect event. Classifies the reason and begins reconnection.
   *
   * @param reason - Why the disconnect occurred
   */
  handleDisconnect(reason: DisconnectReason): void {
    console.log(`[Reconnection] Disconnect detected: ${reason}`);

    // Don't reconnect if the peer intentionally left
    if (reason === 'peer_left') {
      this.setState('connected');
      return;
    }

    this.setState('reconnecting');
    this.attempt = 0;

    if (this.reconnectFn) {
      this.scheduleReconnect();
    }
  }

  /**
   * Attempt reconnection with exponential backoff.
   *
   * @param maxRetries - Maximum number of retry attempts (default: 5)
   */
  async attemptReconnection(maxRetries?: number): Promise<boolean> {
    if (maxRetries !== undefined) {
      this.maxRetries = maxRetries;
    }

    if (!this.reconnectFn) {
      console.error('[Reconnection] No reconnect function set. Call setReconnectFunction first.');
      this.setState('failed');
      return false;
    }

    this.attempt = 0;
    this.setState('reconnecting');

    while (this.attempt < this.maxRetries) {
      this.attempt++;
      this.notifyListeners();

      console.log(
        `[Reconnection] Attempt ${this.attempt}/${this.maxRetries}`,
      );

      try {
        const success = await this.reconnectFn();
        if (success) {
          console.log('[Reconnection] Reconnected successfully');
          this.setState('connected');
          this.attempt = 0;
          return true;
        }
      } catch (err) {
        console.warn(`[Reconnection] Attempt ${this.attempt} failed:`, err);
      }

      // Exponential backoff with jitter
      if (this.attempt < this.maxRetries) {
        const delay = Math.min(
          BASE_DELAY_MS * Math.pow(2, this.attempt - 1) +
            Math.random() * 1000,
          MAX_DELAY_MS,
        );
        console.log(`[Reconnection] Waiting ${Math.round(delay)}ms before next attempt`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.error('[Reconnection] All attempts exhausted');
    this.setState('failed');
    return false;
  }

  /**
   * Set the function used to attempt reconnection.
   * Should return true if reconnection succeeded, false otherwise.
   */
  setReconnectFunction(fn: () => Promise<boolean>): void {
    this.reconnectFn = fn;
  }

  /**
   * Get the current reconnection state.
   */
  getReconnectionState(): ReconnectionState {
    return this.state;
  }

  /**
   * Get the current attempt number (0 if not reconnecting).
   */
  getCurrentAttempt(): number {
    return this.attempt;
  }

  /**
   * Register a callback for state changes.
   *
   * @param callback - Called with (state, attempt, maxAttempts)
   * @returns Unsubscribe function
   */
  onStateChange(callback: ReconnectionStateCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Cancel any pending reconnection attempts.
   */
  cancel(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.setState('failed');
    this.attempt = 0;
  }

  /**
   * Reset to connected state (e.g., after manual reconnection).
   */
  reset(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.attempt = 0;
    this.setState('connected');
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private setState(state: ReconnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state, this.attempt, this.maxRetries);
      } catch (err) {
        console.warn('[Reconnection] Listener error:', err);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnection();
    }, BASE_DELAY_MS);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function scoreToLabel(score: QualityScore): QualityLabel {
  switch (score) {
    case 5: return 'Excellent';
    case 4: return 'Good';
    case 3: return 'Fair';
    case 2: return 'Poor';
    case 1: return 'Critical';
    default: return 'Fair';
  }
}

/**
 * Classify a disconnect event from a WebRTC connection state change.
 */
export function classifyDisconnect(
  iceState: RTCIceConnectionState,
  connectionState?: RTCPeerConnectionState,
): DisconnectReason {
  if (iceState === 'failed') return 'ice_failure';
  if (iceState === 'disconnected') return 'network_change';
  if (connectionState === 'failed') return 'server_error';
  if (connectionState === 'closed') return 'peer_left';
  return 'unknown';
}
