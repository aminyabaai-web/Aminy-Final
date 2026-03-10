/**
 * Telehealth Demo Mode
 *
 * Provides mock video streams, simulated participants, and connection
 * issue simulation for testing telehealth UI without actual WebRTC devices.
 *
 * Key capabilities:
 *   - Canvas-based mock video stream (no camera required)
 *   - Mock participant join/leave for waiting room testing
 *   - Simulated connection issues to test quality UI and reconnection
 *   - Demo participant roster with realistic provider/parent/observer roles
 *
 * Usage:
 *   import { TelehealthDemoMode } from './telehealth-demo-mode';
 *   const demo = new TelehealthDemoMode();
 *   const stream = demo.createMockVideoStream('Dr. Sarah Mitchell');
 *   demo.simulateParticipantJoin('Dr. Sarah Mitchell', 'provider');
 *   demo.simulateConnectionIssue('packet_loss');
 */

import type { QualityScore, QualityLabel } from './telehealth-quality-monitor';

// ============================================================================
// Types
// ============================================================================

export type ParticipantRole = 'provider' | 'parent' | 'observer' | 'interpreter';

export type ConnectionIssueType =
  | 'packet_loss'
  | 'disconnect'
  | 'bandwidth_drop'
  | 'high_latency'
  | 'jitter';

export interface DemoParticipant {
  id: string;
  name: string;
  role: ParticipantRole;
  initials: string;
  avatarColor: string;
  joinedAt: string;
  isVideoOn: boolean;
  isAudioOn: boolean;
  isSpeaking: boolean;
  connectionQuality: QualityScore;
}

export interface ConnectionIssueEvent {
  type: ConnectionIssueType;
  startedAt: string;
  duration: number; // seconds
  severity: 'mild' | 'moderate' | 'severe';
  affectedMetrics: string[];
}

export type ParticipantEventCallback = (
  event: 'join' | 'leave' | 'update',
  participant: DemoParticipant,
) => void;

export type ConnectionIssueCallback = (event: ConnectionIssueEvent) => void;

// ============================================================================
// Constants
// ============================================================================

const AVATAR_COLORS = [
  '#4A90D9', // Blue
  '#50C878', // Green
  '#E07A5F', // Coral
  '#9B59B6', // Purple
  '#F4A261', // Orange
  '#2EC4B6', // Teal
];

const DEFAULT_DEMO_PARTICIPANTS: Omit<DemoParticipant, 'id' | 'joinedAt'>[] = [
  {
    name: 'Dr. Sarah Mitchell, BCBA',
    role: 'provider',
    initials: 'SM',
    avatarColor: AVATAR_COLORS[0],
    isVideoOn: true,
    isAudioOn: true,
    isSpeaking: false,
    connectionQuality: 5,
  },
  {
    name: 'Maria Romero (Parent)',
    role: 'parent',
    initials: 'MR',
    avatarColor: AVATAR_COLORS[1],
    isVideoOn: true,
    isAudioOn: true,
    isSpeaking: false,
    connectionQuality: 4,
  },
  {
    name: 'Clinical Observer',
    role: 'observer',
    initials: 'CO',
    avatarColor: AVATAR_COLORS[2],
    isVideoOn: false,
    isAudioOn: false,
    isSpeaking: false,
    connectionQuality: 5,
  },
];

// ============================================================================
// TelehealthDemoMode
// ============================================================================

export class TelehealthDemoMode {
  private participants: Map<string, DemoParticipant> = new Map();
  private participantListeners: ParticipantEventCallback[] = [];
  private connectionListeners: ConnectionIssueCallback[] = [];
  private mockStreams: Map<string, MediaStream> = new Map();
  private canvasIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private activeIssue: ConnectionIssueEvent | null = null;
  private isActive = false;

  /**
   * Create a canvas-based mock video stream for testing.
   * Generates a stream that shows an animated placeholder with the
   * participant's name, eliminating the need for a real camera.
   *
   * @param participantName - Name to display on the mock video
   * @param width - Stream width in pixels (default: 640)
   * @param height - Stream height in pixels (default: 480)
   * @returns A MediaStream backed by a canvas element
   */
  createMockVideoStream(
    participantName = 'Demo User',
    width = 640,
    height = 480,
  ): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Generate initials
    const initials = participantName
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    // Animate the canvas
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      this.drawMockFrame(ctx, width, height, initials, participantName, color, frame);
    }, 1000 / 15); // 15 FPS

    // Draw initial frame
    this.drawMockFrame(ctx, width, height, initials, participantName, color, 0);

    // Capture stream from canvas
    const stream = canvas.captureStream(15);

    // Create a silent audio track
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0; // Silent
    oscillator.connect(gainNode);
    const dest = audioCtx.createMediaStreamDestination();
    gainNode.connect(dest);
    oscillator.start();

    // Combine video + silent audio
    for (const track of dest.stream.getAudioTracks()) {
      stream.addTrack(track);
    }

    // Track for cleanup
    const streamId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.mockStreams.set(streamId, stream);
    this.canvasIntervals.set(streamId, interval);

    return stream;
  }

  /**
   * Simulate a participant joining the session.
   *
   * @param name - Participant display name
   * @param role - Participant role
   * @returns The created demo participant
   */
  simulateParticipantJoin(name: string, role: ParticipantRole): DemoParticipant {
    const id = `demo-participant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const initials = name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const participant: DemoParticipant = {
      id,
      name,
      role,
      initials,
      avatarColor: AVATAR_COLORS[this.participants.size % AVATAR_COLORS.length],
      joinedAt: new Date().toISOString(),
      isVideoOn: role !== 'observer',
      isAudioOn: role !== 'observer',
      isSpeaking: false,
      connectionQuality: 5,
    };

    this.participants.set(id, participant);
    this.notifyParticipantEvent('join', participant);

    console.log(`[TelehealthDemo] ${name} (${role}) joined`);
    return participant;
  }

  /**
   * Simulate a participant leaving the session.
   */
  simulateParticipantLeave(participantId: string): void {
    const participant = this.participants.get(participantId);
    if (participant) {
      this.participants.delete(participantId);
      this.notifyParticipantEvent('leave', participant);
      console.log(`[TelehealthDemo] ${participant.name} left`);
    }
  }

  /**
   * Simulate a connection quality issue for testing UI.
   *
   * @param type - Type of connection issue to simulate
   * @param durationSeconds - How long the issue lasts (default: 5-15s)
   */
  simulateConnectionIssue(
    type: ConnectionIssueType,
    durationSeconds?: number,
  ): ConnectionIssueEvent {
    const duration = durationSeconds ?? (5 + Math.floor(Math.random() * 10));

    const severityMap: Record<ConnectionIssueType, ConnectionIssueEvent['severity']> = {
      packet_loss: 'moderate',
      disconnect: 'severe',
      bandwidth_drop: 'moderate',
      high_latency: 'mild',
      jitter: 'mild',
    };

    const metricsMap: Record<ConnectionIssueType, string[]> = {
      packet_loss: ['packetLoss', 'quality'],
      disconnect: ['connection', 'video', 'audio'],
      bandwidth_drop: ['bitrate', 'resolution', 'fps'],
      high_latency: ['roundTripTime', 'responsiveness'],
      jitter: ['jitter', 'audioQuality'],
    };

    const event: ConnectionIssueEvent = {
      type,
      startedAt: new Date().toISOString(),
      duration,
      severity: severityMap[type],
      affectedMetrics: metricsMap[type],
    };

    this.activeIssue = event;

    // Degrade participant quality during issue
    for (const [, participant] of this.participants) {
      const degraded = { ...participant };
      switch (type) {
        case 'disconnect':
          degraded.connectionQuality = 1;
          degraded.isVideoOn = false;
          degraded.isAudioOn = false;
          break;
        case 'packet_loss':
          degraded.connectionQuality = 2;
          break;
        case 'bandwidth_drop':
          degraded.connectionQuality = 2;
          break;
        case 'high_latency':
          degraded.connectionQuality = 3;
          break;
        case 'jitter':
          degraded.connectionQuality = 3;
          break;
      }
      this.participants.set(degraded.id, degraded);
      this.notifyParticipantEvent('update', degraded);
    }

    // Notify connection listeners
    for (const listener of this.connectionListeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn('[TelehealthDemo] Connection listener error:', err);
      }
    }

    // Auto-resolve after duration
    setTimeout(() => {
      this.resolveConnectionIssue();
    }, duration * 1000);

    console.log(
      `[TelehealthDemo] Simulating ${type} (${event.severity}) for ${duration}s`,
    );

    return event;
  }

  /**
   * Get the 3 default demo participants (provider, parent, observer).
   */
  getDemoParticipants(): DemoParticipant[] {
    if (this.participants.size === 0) {
      // Auto-populate with defaults
      for (const template of DEFAULT_DEMO_PARTICIPANTS) {
        const id = `demo-default-${template.role}`;
        const participant: DemoParticipant = {
          ...template,
          id,
          joinedAt: new Date().toISOString(),
        };
        this.participants.set(id, participant);
      }
    }
    return Array.from(this.participants.values());
  }

  /**
   * Register a listener for participant events (join, leave, update).
   */
  onParticipantEvent(callback: ParticipantEventCallback): () => void {
    this.participantListeners.push(callback);
    return () => {
      const idx = this.participantListeners.indexOf(callback);
      if (idx >= 0) this.participantListeners.splice(idx, 1);
    };
  }

  /**
   * Register a listener for connection issue events.
   */
  onConnectionIssue(callback: ConnectionIssueCallback): () => void {
    this.connectionListeners.push(callback);
    return () => {
      const idx = this.connectionListeners.indexOf(callback);
      if (idx >= 0) this.connectionListeners.splice(idx, 1);
    };
  }

  /**
   * Get the currently active connection issue, if any.
   */
  getActiveIssue(): ConnectionIssueEvent | null {
    return this.activeIssue;
  }

  /**
   * Clean up all mock streams and intervals.
   */
  cleanup(): void {
    for (const [id, interval] of this.canvasIntervals) {
      clearInterval(interval);
    }
    this.canvasIntervals.clear();

    for (const [id, stream] of this.mockStreams) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    this.mockStreams.clear();

    this.participants.clear();
    this.activeIssue = null;
    this.isActive = false;

    console.log('[TelehealthDemo] Cleaned up all demo resources');
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private resolveConnectionIssue(): void {
    this.activeIssue = null;

    // Restore participant quality
    for (const [, participant] of this.participants) {
      const restored = {
        ...participant,
        connectionQuality: (participant.role === 'parent' ? 4 : 5) as QualityScore,
        isVideoOn: participant.role !== 'observer',
        isAudioOn: participant.role !== 'observer',
      };
      this.participants.set(restored.id, restored);
      this.notifyParticipantEvent('update', restored);
    }

    console.log('[TelehealthDemo] Connection issue resolved');
  }

  private notifyParticipantEvent(
    event: 'join' | 'leave' | 'update',
    participant: DemoParticipant,
  ): void {
    for (const listener of this.participantListeners) {
      try {
        listener(event, participant);
      } catch (err) {
        console.warn('[TelehealthDemo] Participant listener error:', err);
      }
    }
  }

  private drawMockFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    initials: string,
    name: string,
    color: string,
    frame: number,
  ): void {
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Animated circle avatar
    const centerX = width / 2;
    const centerY = height / 2 - 20;
    const radius = Math.min(width, height) * 0.15;
    const pulseRadius = radius + Math.sin(frame * 0.1) * 3;

    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Initials
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${radius * 0.8}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, centerX, centerY);

    // Name below avatar
    ctx.fillStyle = '#cccccc';
    ctx.font = `16px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(name, centerX, centerY + radius + 30);

    // "Demo Mode" badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(width - 120, 10, 110, 28);
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Demo Mode', width - 15, 28);

    // Timestamp
    ctx.textAlign = 'left';
    ctx.fillStyle = '#666666';
    ctx.font = '11px monospace';
    ctx.fillText(
      new Date().toLocaleTimeString(),
      10,
      height - 10,
    );
  }
}

// ============================================================================
// Dev Tools Integration
// ============================================================================

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__telehealthDemo =
    new TelehealthDemoMode();
}
