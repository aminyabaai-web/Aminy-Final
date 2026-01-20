/**
 * VideoCall Component
 *
 * Real video calling using Daily.co
 * Handles the actual video session UI
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Settings,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  createVideoRoom,
  getMeetingToken,
  loadDailySDK,
  createCallObject,
  formatRemainingTime,
  type DailyRoom,
} from '../lib/daily-video';

interface VideoCallProps {
  sessionId: string;
  userId: string;
  userName: string;
  isProvider?: boolean;
  providerName?: string;
  childName?: string;
  sessionType?: '25min' | '50min';
  onCallEnd?: () => void;
  onError?: (error: string) => void;
}

type CallState = 'idle' | 'loading' | 'joining' | 'joined' | 'leaving' | 'error';

interface Participant {
  sessionId: string;
  userId?: string;
  userName?: string;
  isLocal: boolean;
  video: boolean;
  audio: boolean;
  screenShare: boolean;
}

export function VideoCall({
  sessionId,
  userId,
  userName,
  isProvider = false,
  providerName,
  childName,
  sessionType = '50min',
  onCallEnd,
  onError,
}: VideoCallProps) {
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callObjectRef = useRef<any>(null);

  // State
  const [callState, setCallState] = useState<CallState>('idle');
  const [room, setRoom] = useState<DailyRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Local media controls
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);

  // Session timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const sessionDuration = sessionType === '50min' ? 50 * 60 : 25 * 60;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize call
  const initializeCall = useCallback(async () => {
    try {
      setCallState('loading');
      setError(null);

      // Load Daily SDK
      await loadDailySDK();

      // Create or get room
      const videoRoom = await createVideoRoom(sessionId, {
        privacy: 'private',
        expiryMinutes: sessionType === '50min' ? 70 : 40,
        maxParticipants: 4,
        enableKnocking: !isProvider,
        enableScreenShare: true,
        enableChat: true,
        enableRecording: isProvider,
      });
      setRoom(videoRoom);

      // Get meeting token
      const { token } = await getMeetingToken(
        videoRoom.name,
        userId,
        userName,
        isProvider
      );

      // Create call object
      const callObject = await createCallObject({
        url: videoRoom.url,
        token,
        userName,
        startVideoOff: false,
        startAudioOff: false,
      });
      callObjectRef.current = callObject;

      // Set up event listeners
      callObject.on('joined-meeting', handleJoinedMeeting);
      callObject.on('left-meeting', handleLeftMeeting);
      callObject.on('participant-joined', handleParticipantJoined);
      callObject.on('participant-left', handleParticipantLeft);
      callObject.on('participant-updated', handleParticipantUpdated);
      callObject.on('error', handleCallError);
      callObject.on('camera-error', handleCameraError);
      callObject.on('track-started', handleTrackStarted);
      callObject.on('track-stopped', handleTrackStopped);

      // Join the call
      setCallState('joining');
      await callObject.join();
    } catch (err: any) {
      console.error('Failed to initialize call:', err);
      setError(err.message || 'Failed to start video call');
      setCallState('error');
      onError?.(err.message);
    }
  }, [sessionId, userId, userName, isProvider, sessionType, onError]);

  // Handle joined meeting
  const handleJoinedMeeting = useCallback((event: any) => {
    setCallState('joined');

    // Start session timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    // Set up local video
    const callObject = callObjectRef.current;
    if (callObject && localVideoRef.current) {
      const localParticipant = callObject.participants()?.local;
      if (localParticipant?.videoTrack) {
        localVideoRef.current.srcObject = new MediaStream([localParticipant.videoTrack]);
      }
    }

    updateParticipants();
  }, []);

  // Handle left meeting
  const handleLeftMeeting = useCallback(() => {
    setCallState('idle');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onCallEnd?.();
  }, [onCallEnd]);

  // Handle participant joined
  const handleParticipantJoined = useCallback((event: any) => {
    updateParticipants();

    // Set up remote video
    if (remoteVideoRef.current && event.participant?.videoTrack) {
      remoteVideoRef.current.srcObject = new MediaStream([event.participant.videoTrack]);
    }
  }, []);

  // Handle participant left
  const handleParticipantLeft = useCallback((event: any) => {
    updateParticipants();
  }, []);

  // Handle participant updated
  const handleParticipantUpdated = useCallback((event: any) => {
    updateParticipants();
  }, []);

  // Handle call error
  const handleCallError = useCallback((event: any) => {
    console.error('Call error:', event);
    setError(event.errorMsg || 'An error occurred during the call');
    setCallState('error');
  }, []);

  // Handle camera error
  const handleCameraError = useCallback((event: any) => {
    console.error('Camera error:', event);
    setError('Camera access error. Please check your permissions.');
  }, []);

  // Handle track started
  const handleTrackStarted = useCallback((event: any) => {
    if (event.participant && !event.participant.local && event.track.kind === 'video') {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = new MediaStream([event.track]);
      }
    }
  }, []);

  // Handle track stopped
  const handleTrackStopped = useCallback((event: any) => {
    updateParticipants();
  }, []);

  // Update participants list
  const updateParticipants = useCallback(() => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    const allParticipants = callObject.participants();
    const participantList: Participant[] = Object.values(allParticipants).map((p: any) => ({
      sessionId: p.session_id,
      userId: p.user_id,
      userName: p.user_name,
      isLocal: p.local,
      video: !!p.video,
      audio: !!p.audio,
      screenShare: !!p.screen,
    }));
    setParticipants(participantList);
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    callObject.setLocalVideo(!videoEnabled);
    setVideoEnabled(!videoEnabled);
  }, [videoEnabled]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    callObject.setLocalAudio(!audioEnabled);
    setAudioEnabled(!audioEnabled);
  }, [audioEnabled]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    try {
      if (screenShareEnabled) {
        await callObject.stopScreenShare();
      } else {
        await callObject.startScreenShare();
      }
      setScreenShareEnabled(!screenShareEnabled);
    } catch (err) {
      console.error('Screen share error:', err);
    }
  }, [screenShareEnabled]);

  // Leave call
  const leaveCall = useCallback(async () => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    setCallState('leaving');
    await callObject.leave();
    await callObject.destroy();
    callObjectRef.current = null;
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callObjectRef.current) {
        callObjectRef.current.destroy();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Pre-call screen
  if (callState === 'idle') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Ready to Join?
          </h2>
          <p className="text-slate-600 mb-6">
            {isProvider
              ? `Session with ${childName}'s family`
              : `Session with ${providerName || 'your provider'}`}
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span>{sessionType === '50min' ? '50 minute' : '25 minute'} session</span>
            </div>
          </div>

          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              Make sure your camera and microphone are working before joining.
            </AlertDescription>
          </Alert>

          <Button
            size="lg"
            className="w-full bg-teal-600 hover:bg-teal-700"
            onClick={initializeCall}
          >
            <Video className="w-5 h-5 mr-2" />
            Join Video Call
          </Button>
        </Card>
      </div>
    );
  }

  // Loading/joining screen
  if (callState === 'loading' || callState === 'joining') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">
            {callState === 'loading' ? 'Setting up your call...' : 'Joining session...'}
          </p>
        </div>
      </div>
    );
  }

  // Error screen
  if (callState === 'error') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Connection Error
          </h2>
          <p className="text-slate-600 mb-6">
            {error || 'Unable to connect to the video call.'}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCallEnd}
            >
              Go Back
            </Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              onClick={initializeCall}
            >
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Active call screen
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Live
          </Badge>
          <span className="text-white text-sm">
            {isProvider ? `Session with ${childName}'s family` : `Session with ${providerName}`}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            elapsedSeconds > sessionDuration * 0.9 ? 'bg-red-500' : 'bg-slate-700'
          }`}>
            <Clock className="w-4 h-4 text-white" />
            <span className="text-white font-mono text-sm">
              {formatTime(elapsedSeconds)} / {formatTime(sessionDuration)}
            </span>
          </div>

          {/* Participants count */}
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">{participants.length}</span>
          </div>
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="relative w-full max-w-6xl aspect-video bg-slate-800 rounded-xl overflow-hidden">
          {/* Remote video (main) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local video (picture-in-picture) */}
          <div className="absolute bottom-4 right-4 w-48 aspect-video bg-slate-700 rounded-lg overflow-hidden shadow-lg border-2 border-slate-600">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!videoEnabled && (
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-slate-500" />
              </div>
            )}
          </div>

          {/* Waiting for participant */}
          {participants.filter(p => !p.isLocal).length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
                <p className="text-white text-lg">
                  Waiting for {isProvider ? 'parent' : 'provider'} to join...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-4">
          {/* Mic toggle */}
          <Button
            size="lg"
            variant={audioEnabled ? 'secondary' : 'destructive'}
            className="rounded-full w-14 h-14"
            onClick={toggleAudio}
          >
            {audioEnabled ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </Button>

          {/* Video toggle */}
          <Button
            size="lg"
            variant={videoEnabled ? 'secondary' : 'destructive'}
            className="rounded-full w-14 h-14"
            onClick={toggleVideo}
          >
            {videoEnabled ? (
              <Video className="w-6 h-6" />
            ) : (
              <VideoOff className="w-6 h-6" />
            )}
          </Button>

          {/* Screen share */}
          <Button
            size="lg"
            variant={screenShareEnabled ? 'default' : 'secondary'}
            className={`rounded-full w-14 h-14 ${screenShareEnabled ? 'bg-teal-600' : ''}`}
            onClick={toggleScreenShare}
          >
            {screenShareEnabled ? (
              <MonitorOff className="w-6 h-6" />
            ) : (
              <Monitor className="w-6 h-6" />
            )}
          </Button>

          {/* Speaker toggle */}
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-14 h-14"
            onClick={() => setSpeakerEnabled(!speakerEnabled)}
          >
            {speakerEnabled ? (
              <Volume2 className="w-6 h-6" />
            ) : (
              <VolumeX className="w-6 h-6" />
            )}
          </Button>

          {/* Fullscreen */}
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-14 h-14"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="w-6 h-6" />
            ) : (
              <Maximize2 className="w-6 h-6" />
            )}
          </Button>

          {/* End call */}
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
            onClick={leaveCall}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default VideoCall;
