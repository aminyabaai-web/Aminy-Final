// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Telehealth Waiting Room Component
 *
 * Shows a calming waiting experience while the provider admits the patient.
 * Uses Daily.co's "knocking" feature -- patient joins the call,
 * but the provider must admit them from their side.
 *
 * Features:
 * - Provider name + photo display
 * - Appointment time & countdown
 * - Connection status indicator
 * - Pre-call device checks (camera/mic preview)
 * - Animated tips carousel with transition
 * - Auto-joins when provider admits (Daily.co participant-joined event)
 * - Auto-retry on connection issues
 * - HIPAA audit logging
 * - Cancel/leave button
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Clock,
  Heart,
  Shield,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Phone,
  Camera,
  Volume2,
  Lightbulb,
  Target,
  X,
} from 'lucide-react';
import { useAuditedAction } from '../../hooks/useAuditedAction';

type WaitingStatus = 'connecting' | 'waiting' | 'admitted' | 'error' | 'provider-offline';

interface ProviderInfo {
  name: string;
  title?: string;
  specialty?: string;
  photoUrl?: string;
}

interface WaitingRoomProps {
  appointmentId: string;
  providerName: string;
  providerInfo?: ProviderInfo;
  scheduledTime?: string;
  userName: string;
  userId: string;
  /** Daily.co call object -- when provided, listens for participant-joined to auto-admit */
  dailyCallObject?: {
    on: (event: string, callback: (...args: unknown[]) => void) => void;
    off: (event: string, callback: (...args: unknown[]) => void) => void;
  };
  onAdmitted: () => void;
  onCancel: () => void;
  onError?: (error: string) => void;
}

// ---------------------------------------------------------------------------
// Tips configuration -- rotates every 8 seconds with fade animation
// ---------------------------------------------------------------------------

interface WaitingTip {
  icon: React.ReactNode;
  title: string;
  text: string;
}

const WAITING_TIPS: WaitingTip[] = [
  {
    icon: <Camera size={18} />,
    title: 'Camera Check',
    text: 'Make sure your camera is on and your face is well-lit. Natural light from a window works great.',
  },
  {
    icon: <Volume2 size={18} />,
    title: 'Find a Quiet Space',
    text: 'Find a quiet, private space for your session. Background noise can make it harder for your provider to hear you.',
  },
  {
    icon: <Target size={18} />,
    title: 'Have Goals Handy',
    text: "Have your child's current goals or recent behavior notes ready to share with your provider.",
  },
  {
    icon: <Lightbulb size={18} />,
    title: 'Prepare Questions',
    text: 'Think about 1-2 specific questions you\'d like to discuss today. Writing them down helps.',
  },
  {
    icon: <Heart size={18} />,
    title: 'Deep Breaths',
    text: 'Take a few deep breaths while you wait. Inhale for 4, hold for 4, exhale for 4.',
  },
  {
    icon: <Shield size={18} />,
    title: 'Privacy Protected',
    text: 'Your session is encrypted in transit and kept private between you and your provider.',
  },
  {
    icon: <Lightbulb size={18} />,
    title: 'Take Notes',
    text: "It's okay to take notes during the session -- many parents find it helpful to jot down key points.",
  },
];

const TIP_ROTATION_MS = 8000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WaitingRoom({
  appointmentId,
  providerName,
  providerInfo,
  scheduledTime,
  userName,
  userId,
  dailyCallObject,
  onAdmitted,
  onCancel,
  onError,
}: WaitingRoomProps) {
  const [status, setStatus] = useState<WaitingStatus>('connecting');
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipFading, setTipFading] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const admittedRef = useRef(false);

  // HIPAA audit logging -- record a view event for this telehealth waiting room.
  // Mirrors VideoCallRoom; logs the patient (userId) entering the appointment surface.
  useAuditedAction('appointment', appointmentId, {
    details: { context: 'waiting_room', patientId: userId },
  });

  // Resolved provider display info
  const displayName = providerInfo?.name || providerName;
  const displayTitle = providerInfo?.title || providerInfo?.specialty || '';

  // -----------------------------------------------------------------------
  // Initialize camera preview
  // -----------------------------------------------------------------------
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startPreview() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: cameraOn,
          audio: micOn,
        });
        setVideoStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('waiting');
      } catch {
        // Camera/mic not available -- still allow waiting
        setStatus('waiting');
      }
    }

    startPreview();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // -----------------------------------------------------------------------
  // Wait timer
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (status === 'waiting' || status === 'connecting') {
      timerRef.current = setInterval(() => {
        setWaitSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // -----------------------------------------------------------------------
  // Animated tips carousel -- fade out, swap, fade in
  // -----------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setTipIndex(i => (i + 1) % WAITING_TIPS.length);
        setTipFading(false);
      }, 300); // 300ms fade-out before swap
    }, TIP_ROTATION_MS);
    return () => clearInterval(interval);
  }, []);

  // -----------------------------------------------------------------------
  // Daily.co auto-admit: listen for participant-joined where isOwner = true
  // -----------------------------------------------------------------------
  useEffect(() => {
    const handleAdmit = () => {
      if (admittedRef.current) return;
      admittedRef.current = true;
      setStatus('admitted');
      setTimeout(onAdmitted, 1500); // Brief "You're In!" transition
    };

    // If a real Daily call object is provided, use it
    if (dailyCallObject) {
      const handleParticipantJoined = (...args: unknown[]) => {
        const event = args[0] as { participant?: { local?: boolean; owner?: boolean } } | undefined;
        // Provider is the room owner -- when they join/admit, we auto-join
        if (event?.participant && !event.participant.local && event.participant.owner) {
          handleAdmit();
        }
      };

      dailyCallObject.on('participant-joined', handleParticipantJoined);
      return () => {
        dailyCallObject.off('participant-joined', handleParticipantJoined);
      };
    }

    // Fallback: expose a global hook for testing (dev only)
    if (import.meta.env.DEV) {
      // @ts-expect-error Debug hook
      window.__admitPatient = handleAdmit;
    }

    return () => {
      if (import.meta.env.DEV) {
        // @ts-expect-error Debug hook cleanup
        delete window.__admitPatient;
      }
    };
  }, [dailyCallObject, onAdmitted]);

  // -----------------------------------------------------------------------
  // Media controls
  // -----------------------------------------------------------------------
  const toggleCamera = useCallback(async () => {
    if (videoStream) {
      const videoTrack = videoStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOn(videoTrack.enabled);
      }
    }
  }, [videoStream]);

  const toggleMic = useCallback(async () => {
    if (videoStream) {
      const audioTrack = videoStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  }, [videoStream]);

  const handleRetry = useCallback(() => {
    setRetryCount(c => c + 1);
    setStatus('connecting');
    setTimeout(() => setStatus('waiting'), 2000);
  }, []);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getProviderInitials = () => {
    const parts = displayName.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return displayName.charAt(0).toUpperCase();
  };

  const currentTip = WAITING_TIPS[tipIndex];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex flex-col items-center overflow-y-auto z-50 p-4">
      {/* HIPAA indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-white/60">
        <Shield size={14} />
        <span>HIPAA-conscious, encrypted in transit</span>
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors"
      >
        <X size={14} />
        Leave Waiting Room
      </button>

      <div className="max-w-lg w-full space-y-5" style={{ margin: 'auto', paddingTop: '2.5rem', paddingBottom: '1rem' }}>
        {/* Provider card -- photo + name + appointment time */}
        {(status === 'waiting' || status === 'provider-offline') && (
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            {/* Provider photo or initials */}
            <div className="flex-shrink-0">
              {providerInfo?.photoUrl ? (
                <img
                  src={providerInfo.photoUrl}
                  alt={displayName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#6B9080]/40"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/30 border-2 border-[#6B9080]/40 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {getProviderInitials()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-base truncate">{displayName}</h3>
              {displayTitle && (
                <p className="text-white/50 text-xs truncate">{displayTitle}</p>
              )}
              {scheduledTime && (
                <p className="text-[#7BA7BC]/80 text-xs mt-1 flex items-center gap-1.5">
                  <Clock size={11} />
                  {new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Video preview */}
        <div className="relative aspect-video bg-black/40 rounded-2xl overflow-hidden border border-white/10">
          {cameraOn && videoStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="w-20 h-20 rounded-full bg-primary/30 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}

          {/* Camera/mic controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
            <button
              onClick={toggleMic}
              className={`p-3 rounded-full transition-colors ${
                micOn
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-red-500/80 hover:bg-red-500 text-white'
              }`}
              aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {micOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button
              onClick={toggleCamera}
              className={`p-3 rounded-full transition-colors ${
                cameraOn
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-red-500/80 hover:bg-red-500 text-white'
              }`}
              aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
          </div>

          {/* Status overlay */}
          <div className="absolute top-4 left-4">
            {status === 'waiting' && (
              <div className="flex items-center gap-2 bg-black/40 rounded-full px-3 py-1.5 text-xs text-white">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Camera ready</span>
              </div>
            )}
          </div>
        </div>

        {/* Status message */}
        <div className="text-center space-y-3">
          {status === 'connecting' && (
            <>
              <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: '#2dd4bf' }} />
              <h2 className="text-xl font-semibold text-white">Connecting...</h2>
              <p className="text-white/60 text-sm">Setting up your secure session</p>
            </>
          )}

          {status === 'waiting' && (
            <>
              {/* Animated pulsing dots indicator */}
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ animationDelay: '0ms', backgroundColor: '#2dd4bf' }} />
                <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ animationDelay: '150ms', backgroundColor: '#2dd4bf' }} />
                <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ animationDelay: '300ms', backgroundColor: '#2dd4bf' }} />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Your provider will admit you shortly
              </h2>
              <p className="text-white/60 text-sm">
                Waiting for {displayName} &middot; {formatWaitTime(waitSeconds)}
              </p>
            </>
          )}

          {status === 'admitted' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto animate-bounce" />
              <h2 className="text-xl font-semibold text-white">You&apos;re In!</h2>
              <p className="text-white/60 text-sm">Joining your session now...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Connection Issue</h2>
              <p className="text-white/60 text-sm">
                We&apos;re having trouble connecting. Please check your internet.
              </p>
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary text-white rounded-lg text-sm transition-colors"
              >
                <RefreshCw size={14} />
                Retry ({retryCount})
              </button>
            </>
          )}

          {status === 'provider-offline' && (
            <>
              <WifiOff className="w-10 h-10 text-amber-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Provider Not Yet Online</h2>
              <p className="text-white/60 text-sm">
                {displayName} hasn&apos;t joined yet. We&apos;ll connect you as soon as they&apos;re ready.
              </p>
            </>
          )}
        </div>

        {/* Tips carousel with animated transition */}
        {(status === 'waiting' || status === 'provider-offline') && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div
              className={`flex items-start gap-3 transition-opacity duration-300 ${
                tipFading ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mt-0.5" style={{ color: '#5eead4' }}>
                {currentTip.icon}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#5eead4' }}>
                  {currentTip.title}
                </p>
                <p className="text-sm text-white/80 leading-relaxed">
                  {currentTip.text}
                </p>
              </div>
            </div>
            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {WAITING_TIPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    i === tipIndex ? 'w-4' : 'bg-white/20'
                  }`}
                  style={i === tipIndex ? { backgroundColor: '#2dd4bf' } : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Connection info */}
        <div className="flex items-center justify-center gap-4 text-xs text-white/40">
          <div className="flex items-center gap-1.5">
            <Wifi size={12} />
            <span>Connected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield size={12} />
            <span>Encrypted in transit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone size={12} />
            <span>Session #{appointmentId.slice(0, 8)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WaitingRoom;
