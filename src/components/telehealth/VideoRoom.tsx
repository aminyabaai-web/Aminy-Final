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
  MessageCircle,
  MoreVertical,
  Clock,
  AlertTriangle,
  X,
  Users,
} from 'lucide-react';
import {
  joinTelehealthSession,
  leaveCall,
  toggleAudio,
  toggleVideo,
  startScreenShare,
  stopScreenShare,
  attachCallEventHandlers,
  VideoParticipant,
  VideoCallState,
  initialVideoCallState,
  formatRemainingTime,
} from '../../lib/daily-video';

interface VideoRoomProps {
  appointmentId: string;
  userId: string;
  userName: string;
  isProvider?: boolean;
  scheduledEndTime?: string;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export function VideoRoom({
  appointmentId,
  userId,
  userName,
  isProvider = false,
  scheduledEndTime,
  onEnd,
  onError,
}: VideoRoomProps) {
  const [callState, setCallState] = useState<VideoCallState>(initialVideoCallState);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const callObjectRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<Date | null>(null);

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

  // Handle end call
  const handleEndCall = useCallback(async () => {
    setShowEndConfirm(false);
    setCallState(prev => ({ ...prev, state: 'leaving' }));

    if (callObjectRef.current) {
      await leaveCall(callObjectRef.current);
    }

    onEnd?.();
  }, [onEnd]);

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
            className="mt-4 sm:mt-6 px-6 py-2 bg-white text-gray-900 rounded-lg font-medium"
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
            {scheduledEndTime && (
              <span className="text-white/60 text-sm">
                • Ends {formatRemainingTime(scheduledEndTime)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-white" />
            </button>
            <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <MoreVertical className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Video Feeds */}
      <div className="flex-1 relative">
        {/* Remote Video (Main) */}
        <div className="absolute inset-0 bg-gray-800">
          {remoteParticipant ? (
            remoteParticipant.video ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
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
                  <Users className="w-8 h-8 text-gray-400" />
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
                <p className="text-white/60 text-xs mt-2">Camera off</p>
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

          {/* End Call */}
          <button
            onClick={() => setShowEndConfirm(true)}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          >
            <Phone className="w-6 h-6 text-white transform rotate-135" />
          </button>
        </div>
      </div>

      {/* End Call Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-red-500 transform rotate-135" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">End Session?</h3>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to end this video session?
              </p>
            </div>

            <div className="flex gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 px-4 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
    </div>
  );
}

export default VideoRoom;
