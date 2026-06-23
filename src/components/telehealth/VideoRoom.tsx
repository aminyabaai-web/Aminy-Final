// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Video Room Component
 * Full-featured video call UI for telehealth sessions
 *
 * Features:
 * - Local/remote video feeds
 * - Audio/video toggle
 * - Screen sharing
 * - Session timer
 * - Waiting room / knock support
 * - End call confirmation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  Monitor,
  MonitorOff,
  AlertTriangle,
  X,
  Users,
  Circle,
  Shield,
  CheckCircle,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import {
  joinTelehealthSession,
  leaveCall,
  toggleAudio,
  toggleVideo,
  startScreenShare,
  stopScreenShare,
  startRecording,
  stopRecording,
  attachCallEventHandlers,
  VideoParticipant,
  VideoCallState,
  initialVideoCallState,
  formatRemainingTime,
  type DailyCallObject,
} from '../../lib/daily-video';
import { useAuditedAction } from '../../hooks/useAuditedAction';
import { DEFAULT_RETENTION_POLICIES, type RetentionPolicy } from '../../lib/hipaa-compliance';
import { useConnectionQuality } from '../../hooks/useConnectionQuality';
import { useAutoReconnect } from '../../hooks/useAutoReconnect';
import { ConnectionQualityIndicator } from './ConnectionQualityIndicator';
import { PostSessionNotes } from './PostSessionNotes';
import {
  logRecordingConsent,
  createRecordingMetadata,
  updateRecordingMetadata,
} from '../../lib/recording-storage';

interface VideoRoomProps {
  appointmentId: string;
  userId: string;
  userName: string;
  isProvider?: boolean;
  /** Patient's user ID (for care-plan & recording storage) */
  patientId?: string;
  /** Provider's user ID (for care-plan & recording storage) */
  providerId?: string;
  /** Pre-filled reason for visit from booking */
  reasonForVisit?: string;
  scheduledEndTime?: string;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export function VideoRoom({
  appointmentId,
  userId,
  userName,
  isProvider = false,
  patientId,
  providerId,
  reasonForVisit,
  scheduledEndTime,
  onEnd,
  onError,
}: VideoRoomProps) {
  const [callState, setCallState] = useState<VideoCallState>(initialVideoCallState);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [showRecordingConsent, setShowRecordingConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Post-session notes state
  const [showPostSessionNotes, setShowPostSessionNotes] = useState(false);
  const [sessionEndedNaturally, setSessionEndedNaturally] = useState(false);

  // Recording metadata tracking
  const recordingMetadataIdRef = useRef<string | null>(null);

  const callObjectRef = useRef<DailyCallObject | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<Date | null>(null);
  const recordingStartTimeRef = useRef<Date | null>(null);

  // HIPAA audit logging for telehealth session
  const { logAction } = useAuditedAction('telehealth_session', appointmentId);

  // Connection quality monitoring
  const { quality: connectionQuality, stats: connectionStats } =
    useConnectionQuality(callObjectRef.current);

  // Auto-reconnect on network drops
  const reconnect = useAutoReconnect(callObjectRef.current, {
    roomUrl: callState.roomUrl || '',
    userName,
    onReconnected: () => {
      logAction('auto_reconnected', { appointmentId });
    },
    onReconnectFailed: () => {
      logAction('reconnect_failed', { appointmentId });
    },
  });

  // Get the session notes retention policy for display in consent modal
  const sessionRetention: RetentionPolicy | undefined = DEFAULT_RETENTION_POLICIES.find(
    p => p.resourceType === 'session_notes'
  );
  const retentionYears = sessionRetention
    ? Math.round(sessionRetention.retentionDays / 365)
    : 7;

  // Join the call on mount
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const joinCall = async () => {
      setCallState(prev => ({ ...prev, state: 'joining' }));

      try {
        const { callObject, roomUrl } = await joinTelehealthSession(
          appointmentId,
          userId,
          userName,
          isProvider
        );

        callObjectRef.current = callObject;
        startTimeRef.current = new Date();

        // Attach event handlers
        cleanup = attachCallEventHandlers(callObject, {
          onJoined: (participant) => {
            setCallState(prev => ({
              ...prev,
              state: 'joined',
              localParticipant: participant,
              roomUrl,
            }));
          },
          onParticipantJoined: (participant) => {
            setCallState(prev => ({
              ...prev,
              participants: [...prev.participants, participant],
            }));
          },
          onParticipantLeft: (sessionId) => {
            setCallState(prev => ({
              ...prev,
              participants: prev.participants.filter(p => p.sessionId !== sessionId),
            }));
          },
          onParticipantUpdated: (participant) => {
            setCallState(prev => ({
              ...prev,
              participants: prev.participants.map(p =>
                p.sessionId === participant.sessionId ? { ...p, ...participant } : p
              ),
              localParticipant: participant.isLocal ? { ...prev.localParticipant, ...participant } : prev.localParticipant,
            }));
          },
          onError: (error) => {
            setCallState(prev => ({ ...prev, state: 'error', error }));
            onError?.(error);
          },
          onCallEnded: () => {
            setCallState(prev => ({ ...prev, state: 'idle' }));
            onEnd?.();
          },
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to join call';
        setCallState(prev => ({
          ...prev,
          state: 'error',
          error: message,
        }));
        onError?.(message);
      }
    };

    joinCall();

    return () => {
      cleanup?.();
      if (callObjectRef.current) {
        leaveCall(callObjectRef.current).catch(console.error);
      }
    };
  }, [appointmentId, userId, userName, isProvider, onEnd, onError]);

  // Update elapsed time
  useEffect(() => {
    if (callState.state !== 'joined') return;

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [callState.state]);

  // True once the remote participant's video track is actually playable and
  // attached. Until then we show an honest "Connecting video…" state rather
  // than a permanently blank black box.
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);

  // Attach the live Daily MediaStream tracks to the <video> elements.
  // The refs alone never receive a stream — Daily hands us tracks via the
  // call object, so we read them off participants() and wire them here.
  // Re-runs whenever join state or participant video flags change.
  const syncVideoStreams = useCallback(() => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    const all = callObject.participants();
    const local = all['local'];
    const remote = Object.values(all).find(p => p && !p.local);

    // Local PIP
    if (localVideoRef.current) {
      const localTrack = local?.tracks?.video?.persistentTrack;
      if (localTrack) {
        const existing = localVideoRef.current.srcObject as MediaStream | null;
        if (!existing || existing.getVideoTracks()[0]?.id !== localTrack.id) {
          localVideoRef.current.srcObject = new MediaStream([localTrack]);
          localVideoRef.current.play().catch(() => { /* autoplay may be blocked */ });
        }
      } else if (localVideoRef.current.srcObject) {
        localVideoRef.current.srcObject = null;
      }
    }

    // Remote main
    if (remoteVideoRef.current) {
      const remoteVideo = remote?.tracks?.video;
      const remoteTrack = remoteVideo?.persistentTrack;
      const playable = remoteVideo?.state === 'playable' && !!remoteTrack;
      if (playable && remoteTrack) {
        const existing = remoteVideoRef.current.srcObject as MediaStream | null;
        if (!existing || existing.getVideoTracks()[0]?.id !== remoteTrack.id) {
          remoteVideoRef.current.srcObject = new MediaStream([remoteTrack]);
          remoteVideoRef.current.play().catch(() => { /* autoplay may be blocked */ });
        }
        setRemoteVideoReady(true);
      } else {
        if (remoteVideoRef.current.srcObject) remoteVideoRef.current.srcObject = null;
        setRemoteVideoReady(false);
      }
    } else {
      setRemoteVideoReady(false);
    }
  }, []);

  // Wire/re-wire streams when the call connects or participant video changes.
  useEffect(() => {
    if (callState.state !== 'joined') return;
    syncVideoStreams();
  }, [
    callState.state,
    callState.isVideoOff,
    callState.participants,
    callState.localParticipant,
    syncVideoStreams,
  ]);

  // Format elapsed time
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle audio toggle
  const handleToggleAudio = useCallback(async () => {
    if (!callObjectRef.current) return;
    const newState = await toggleAudio(callObjectRef.current);
    setCallState(prev => ({ ...prev, isMuted: !newState }));
  }, []);

  // Handle video toggle
  const handleToggleVideo = useCallback(async () => {
    if (!callObjectRef.current) return;
    const newState = await toggleVideo(callObjectRef.current);
    setCallState(prev => ({ ...prev, isVideoOff: !newState }));
  }, []);

  // Handle screen share toggle
  const handleToggleScreenShare = useCallback(async () => {
    if (!callObjectRef.current) return;
    if (callState.isScreenSharing) {
      await stopScreenShare(callObjectRef.current);
    } else {
      await startScreenShare(callObjectRef.current);
    }
    setCallState(prev => ({ ...prev, isScreenSharing: !prev.isScreenSharing }));
  }, [callState.isScreenSharing]);

  // Handle recording consent — user clicks "I Consent" in the modal
  const handleRecordingConsent = useCallback(async () => {
    setShowRecordingConsent(false);
    setConsentChecked(false);

    const consentTimestamp = new Date().toISOString();

    logAction('recording_consent_given', {
      appointmentId,
      consentTimestamp,
      retentionDays: sessionRetention?.retentionDays ?? 2555,
    });

    // Persist consent to recording-storage service (HIPAA audit trail)
    await logRecordingConsent({
      sessionId: appointmentId,
      userId,
      userName,
      role: isProvider ? 'provider' : 'patient',
      consentGiven: true,
      consentTimestamp,
    });

    if (!callObjectRef.current) return;
    const started = await startRecording(callObjectRef.current);
    if (started) {
      setIsRecording(true);
      recordingStartTimeRef.current = new Date();
      logAction('recording_started', { appointmentId });

      // Create recording metadata in Supabase
      if (providerId && patientId) {
        const metadata = await createRecordingMetadata({
          sessionId: appointmentId,
          appointmentId,
          providerId,
          patientId,
        });
        recordingMetadataIdRef.current = metadata.id;
      }
    }
  }, [appointmentId, userId, userName, isProvider, providerId, patientId, logAction, sessionRetention]);

  // Handle recording consent declined
  const handleRecordingDeclined = useCallback(async () => {
    setShowRecordingConsent(false);
    setConsentChecked(false);
    logAction('recording_consent_declined', { appointmentId });

    // Log the decline for HIPAA audit trail
    await logRecordingConsent({
      sessionId: appointmentId,
      userId,
      userName,
      role: isProvider ? 'provider' : 'patient',
      consentGiven: false,
      consentTimestamp: new Date().toISOString(),
    });
  }, [appointmentId, userId, userName, isProvider, logAction]);

  // Handle stop recording
  const handleStopRecording = useCallback(async () => {
    if (!callObjectRef.current) return;
    const stopped = await stopRecording(callObjectRef.current);
    if (stopped) {
      setIsRecording(false);
      const durationSeconds = recordingStartTimeRef.current
        ? Math.floor((Date.now() - recordingStartTimeRef.current.getTime()) / 1000)
        : 0;
      recordingStartTimeRef.current = null;
      logAction('recording_stopped', { appointmentId, recordingDurationSeconds: durationSeconds });

      // Update recording metadata with duration
      if (recordingMetadataIdRef.current) {
        await updateRecordingMetadata(recordingMetadataIdRef.current, {
          status: 'processing',
          durationSeconds,
        });
      }
    }
  }, [appointmentId, logAction]);

  // Toggle recording — shows consent modal if not yet recording
  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      handleStopRecording();
    } else {
      setShowRecordingConsent(true);
    }
  }, [isRecording, handleStopRecording]);

  // Handle end call
  const handleEndCall = useCallback(async () => {
    setShowEndConfirm(false);
    setCallState(prev => ({ ...prev, state: 'leaving' }));

    // Auto-stop recording if active
    if (isRecording && callObjectRef.current) {
      await stopRecording(callObjectRef.current);
      logAction('recording_stopped', { appointmentId, reason: 'call_ended' });
      setIsRecording(false);

      // Mark recording metadata as processing (Daily will provide download URL later)
      if (recordingMetadataIdRef.current) {
        const durationSeconds = recordingStartTimeRef.current
          ? Math.floor((Date.now() - recordingStartTimeRef.current.getTime()) / 1000)
          : 0;
        await updateRecordingMetadata(recordingMetadataIdRef.current, {
          status: 'processing',
          durationSeconds,
        });
      }
    }

    // Mark this as an intentional leave so auto-reconnect doesn't trigger
    if (callObjectRef.current) {
      const markFn = (callObjectRef.current as unknown as Record<string, unknown>).__markIntentionalLeave;
      if (typeof markFn === 'function') markFn();
      await leaveCall(callObjectRef.current);
    }

    setSessionEndedNaturally(true);

    // If the user is a provider, show post-session notes instead of immediately closing
    if (isProvider && patientId && providerId) {
      setShowPostSessionNotes(true);
    } else {
      onEnd?.();
    }
  }, [onEnd, isRecording, isProvider, patientId, providerId, appointmentId, logAction]);

  // Render loading state
  if (callState.state === 'joining') {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Connecting to your session...</p>
          <p className="text-sm text-white/60 mt-2">Please wait while we set up your video call</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (callState.state === 'error') {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center text-white max-w-md mx-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-lg font-medium">Connection Failed</p>
          <p className="text-sm text-white/60 mt-2">{callState.error}</p>
          <button
            onClick={onEnd}
            className="mt-4 sm:mt-6 px-6 py-2 bg-white text-[#1B2733] rounded-lg font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const remoteParticipant = callState.participants.find(p => !p.isLocal);

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white text-sm font-medium">
              {formatElapsedTime(elapsedTime)}
            </span>
            {isRecording && (
              <div className="flex items-center gap-1.5 bg-red-500/80 px-2 py-0.5 rounded-full">
                <Circle className="w-2.5 h-2.5 text-white fill-white animate-pulse" />
                <span className="text-white text-sm font-medium">REC</span>
              </div>
            )}
            {scheduledEndTime && (
              <span className="text-white/60 text-sm">
                • Ends {formatRemainingTime(scheduledEndTime)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Connection quality indicator */}
            <ConnectionQualityIndicator
              quality={connectionQuality}
              stats={connectionStats}
              variant="pill"
            />
          </div>
        </div>
      </header>

      {/* Video Feeds */}
      <div className="flex-1 relative">
        {/* Remote Video (Main) */}
        <div className="absolute inset-0 bg-gray-800">
          {remoteParticipant ? (
            remoteParticipant.video ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!remoteVideoReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-white/80 text-sm">Connecting video…</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl text-white font-semibold">
                      {remoteParticipant.userName?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <p className="text-white font-medium">{remoteParticipant.userName}</p>
                  <p className="text-white/60 text-sm mt-1">Camera off</p>
                </div>
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-[#8A9BA8]" />
                </div>
                <p className="text-white font-medium">Waiting for participant...</p>
                <p className="text-white/60 text-sm mt-1">
                  {isProvider ? 'Your patient will join shortly' : 'Your provider will join shortly'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (PIP) */}
        <div className="absolute bottom-24 right-4 w-32 h-44 bg-gray-700 rounded-xl overflow-hidden shadow-lg border border-white/10">
          {callState.isVideoOff ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-medium">
                    {userName[0]?.toUpperCase() || 'Y'}
                  </span>
                </div>
                <p className="text-white/60 text-sm mt-2">Camera off</p>
              </div>
            </div>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Muted indicator */}
          {callState.isMuted && (
            <div className="absolute top-2 right-2 p-1 bg-red-500 rounded-full">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-8">
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          {/* Mute */}
          <button
            onClick={handleToggleAudio}
            aria-label={callState.isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`p-4 rounded-full transition-colors ${
              callState.isMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            {callState.isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Video */}
          <button
            onClick={handleToggleVideo}
            aria-label={callState.isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            className={`p-4 rounded-full transition-colors ${
              callState.isVideoOff
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            {callState.isVideoOff ? (
              <VideoOff className="w-6 h-6 text-white" />
            ) : (
              <Video className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Screen Share */}
          <button
            onClick={handleToggleScreenShare}
            aria-label={callState.isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
            className={`p-4 rounded-full transition-colors ${
              callState.isScreenSharing
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            {callState.isScreenSharing ? (
              <MonitorOff className="w-6 h-6 text-white" />
            ) : (
              <Monitor className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Record */}
          {isProvider && (
            <button
              onClick={handleToggleRecording}
              className={`p-4 rounded-full transition-colors ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 ring-2 ring-red-300 ring-offset-2 ring-offset-gray-900'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <Circle className={`w-6 h-6 text-white ${isRecording ? 'fill-white' : ''}`} />
            </button>
          )}

          {/* End Call */}
          <button
            onClick={() => setShowEndConfirm(true)}
            aria-label="End call"
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          >
            <Phone className="w-6 h-6 text-white" style={{ transform: 'rotate(135deg)' }} />
          </button>
        </div>
      </div>

      {/* End Call Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-red-500" style={{ transform: 'rotate(135deg)' }} />
              </div>
              <h3 className="text-lg font-semibold text-[#1B2733]">End Session?</h3>
              <p className="text-sm text-[#5A6B7A] mt-2">
                Are you sure you want to end this video session?
              </p>
            </div>

            <div className="flex gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 px-4 border border-[#E8E4DF] rounded-xl font-medium text-[#3A4A57] hover:bg-[#FAF7F2] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEndCall}
                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                End Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIPAA Recording Consent Modal */}
      {showRecordingConsent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header with HIPAA shield */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#EEF4F8] rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1B2733]">Recording Consent Required</h3>
                <p className="text-sm text-[#5A6B7A]">HIPAA §164.508(a) Authorization</p>
              </div>
            </div>

            {/* Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-amber-800 font-medium mb-1">
                This session will be recorded
              </p>
              <p className="text-sm text-amber-700">
                All participants will be notified that recording is active.
                The recording will include audio and video from all participants.
              </p>
            </div>

            {/* Retention policy details */}
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#3A4A57]">
                  Recordings are encrypted in transit and at rest
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#3A4A57]">
                  Retained for <span className="font-semibold">{retentionYears} years</span> per {sessionRetention?.legalBasis ?? 'HIPAA §164.530(j)'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#3A4A57]">
                  Accessible only to authorized providers and the patient/guardian
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#3A4A57]">
                  Your consent is logged and auditable per HIPAA requirements
                </p>
              </div>
            </div>

            {/* Consent checkbox */}
            <label className="flex items-start gap-3 p-3 bg-[#FAF7F2] rounded-xl cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 border-[#E8E4DF] rounded focus:ring-blue-500"
              />
              <span className="text-sm text-[#3A4A57] leading-snug">
                I understand and consent to this telehealth session being recorded. I acknowledge
                the recording will be stored per the retention policy above and may be used for
                clinical documentation purposes.
              </span>
            </label>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleRecordingDeclined}
                className="flex-1 py-3 px-4 border border-[#E8E4DF] rounded-xl font-medium text-[#3A4A57] hover:bg-[#FAF7F2] transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleRecordingConsent}
                disabled={!consentChecked}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                  consentChecked
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-[#E8E4DF] text-[#8A9BA8] cursor-not-allowed'
                }`}
              >
                I Consent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Reconnect Overlay (suppressed once the user intentionally ends) */}
      {!sessionEndedNaturally && reconnect.state === 'reconnecting' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white">Reconnecting...</h3>
            <p className="text-sm text-white/60 mt-2">
              Connection was interrupted. Attempting to rejoin.
            </p>
            <p className="text-sm text-white/40 mt-3">
              Attempt {reconnect.attemptCount} &middot; {reconnect.secondsRemaining}s remaining
            </p>
            <button
              onClick={reconnect.cancel}
              className="mt-4 px-4 py-2 border border-white/20 rounded-lg text-sm text-white/70 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Connection Lost Overlay (suppressed once the user intentionally ends) */}
      {!sessionEndedNaturally && reconnect.state === 'connection-lost' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <WifiOff className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Connection Lost</h3>
            <p className="text-sm text-white/60 mt-2">
              Unable to reconnect to the session. Check your network and try again.
            </p>
            <div className="flex gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => onEnd?.()}
                className="flex-1 py-3 px-4 border border-white/20 rounded-xl font-medium text-sm text-white/70 hover:bg-white/10 transition-colors"
              >
                Leave
              </button>
              <button
                onClick={reconnect.retryNow}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Session Notes (provider only) */}
      {showPostSessionNotes && isProvider && patientId && providerId && (
        <PostSessionNotes
          appointmentId={appointmentId}
          userId={userId}
          patientId={patientId}
          providerId={providerId}
          reasonForVisit={reasonForVisit}
          sessionDurationSeconds={elapsedTime}
          wasRecorded={!!recordingMetadataIdRef.current}
          onSaved={() => {
            setShowPostSessionNotes(false);
            onEnd?.();
          }}
          onSkip={() => {
            setShowPostSessionNotes(false);
            onEnd?.();
          }}
        />
      )}
    </div>
  );
}

export default VideoRoom;
