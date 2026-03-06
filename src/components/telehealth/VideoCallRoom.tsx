/**
 * VideoCall Component
 *
 * Real video calling using Daily.co
 * Handles the actual video session UI
 * Enhanced with in-call chat, recording, and connection quality indicator
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
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
  Circle,
  Send,
  X,
  Wifi,
  WifiOff,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
} from 'lucide-react';
import {
  createVideoRoom,
  getMeetingToken,
  loadDailySDK,
  createCallObject,
  formatRemainingTime,
  type DailyRoom,
} from '../../lib/daily-video';
import type { DailyEvent, DailyCallObject, DailyParticipant, DailyEventObjectAppMessage, DailyEventHandler } from '../../types/video';

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

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  isLocal: boolean;
}

type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

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
  const callObjectRef = useRef<DailyCallObject | null>(null);

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

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Recording state (providers only)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);

  // Connection quality
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('unknown');
  const [networkStats, setNetworkStats] = useState<{ bitrate?: number; packetLoss?: number }>({});

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start video call';
      console.error('Failed to initialize call:', err);
      setError(errorMessage);
      setCallState('error');
      onError?.(errorMessage);
    }
  }, [sessionId, userId, userName, isProvider, sessionType, onError]);

  // Handle joined meeting
  const handleJoinedMeeting = useCallback((event: DailyEvent) => {
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
  const handleParticipantJoined = useCallback((event: DailyEvent) => {
    updateParticipants();

    // Set up remote video
    if (remoteVideoRef.current && event.participant?.tracks?.video?.persistentTrack) {
      remoteVideoRef.current.srcObject = new MediaStream([event.participant.tracks.video.persistentTrack]);
    }
  }, []);

  // Handle participant left
  const handleParticipantLeft = useCallback((_event: DailyEvent) => {
    updateParticipants();
  }, []);

  // Handle participant updated
  const handleParticipantUpdated = useCallback((_event: DailyEvent) => {
    updateParticipants();
  }, []);

  // Handle call error
  const handleCallError = useCallback((event: DailyEvent) => {
    console.error('Call error:', event);
    setError(event.errorMsg || event.error?.msg || 'An error occurred during the call');
    setCallState('error');
  }, []);

  // Handle camera error
  const handleCameraError = useCallback((event: DailyEvent) => {
    console.error('Camera error:', event);
    setError('Camera access error. Please check your permissions.');
  }, []);

  // Handle track started
  const handleTrackStarted = useCallback((event: DailyEvent) => {
    if (event.participant && !event.participant.local && event.track?.kind === 'video') {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = new MediaStream([event.track]);
      }
    }
  }, []);

  // Handle track stopped
  const handleTrackStopped = useCallback((_event: DailyEvent) => {
    updateParticipants();
  }, []);

  // Update participants list
  const updateParticipants = useCallback(() => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    const allParticipants = callObject.participants();
    const participantList: Participant[] = Object.values(allParticipants).map((p: DailyParticipant) => ({
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

  // =========== CHAT FUNCTIONALITY ===========

  // Send chat message
  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim()) return;

    const callObject = callObjectRef.current;
    if (!callObject) return;

    const message: ChatMessage = {
      id: `${Date.now()}-${userId}`,
      senderId: userId,
      senderName: userName,
      text: chatInput.trim(),
      timestamp: new Date(),
      isLocal: true,
    };

    // Add to local messages
    setChatMessages(prev => [...prev, message]);
    setChatInput('');

    // Send via Daily chat
    try {
      callObject.sendAppMessage({ type: 'chat', message }, '*');
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  }, [chatInput, userId, userName]);

  // Handle incoming chat messages
  const handleAppMessage: DailyEventHandler = useCallback((event) => {
    const data = 'data' in event ? (event as DailyEventObjectAppMessage).data : undefined;
    if (data && data.type === 'chat' && data.message) {
      const msg = data.message as Record<string, unknown>;
      const incomingMessage: ChatMessage = {
        ...(msg as unknown as ChatMessage),
        isLocal: false,
        timestamp: new Date(msg.timestamp as string),
      };
      setChatMessages(prev => [...prev, incomingMessage]);

      // Increment unread count if chat is closed
      if (!chatOpen) {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [chatOpen]);

  // Open chat and reset unread count
  const toggleChat = useCallback(() => {
    setChatOpen(prev => {
      if (!prev) {
        setUnreadCount(0);
      }
      return !prev;
    });
  }, []);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // =========== RECORDING FUNCTIONALITY ===========

  // Toggle recording (providers only)
  const toggleRecording = useCallback(async () => {
    if (!isProvider) return;

    const callObject = callObjectRef.current;
    if (!callObject) return;

    try {
      if (isRecording) {
        await callObject.stopRecording();
        setIsRecording(false);
        setRecordingStartTime(null);
      } else {
        await callObject.startRecording();
        setIsRecording(true);
        setRecordingStartTime(new Date());
      }
    } catch (err) {
      console.error('Recording error:', err);
    }
  }, [isProvider, isRecording]);

  // =========== CONNECTION QUALITY ===========

  // Get connection quality indicator
  const getConnectionQualityIcon = useCallback(() => {
    switch (connectionQuality) {
      case 'excellent':
        return <SignalHigh className="w-4 h-4 text-green-500" />;
      case 'good':
        return <SignalMedium className="w-4 h-4 text-green-400" />;
      case 'fair':
        return <SignalLow className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <Wifi className="w-4 h-4 text-slate-400" />;
    }
  }, [connectionQuality]);

  // Monitor network quality
  useEffect(() => {
    const callObject = callObjectRef.current;
    if (!callObject || callState !== 'joined') return;

    // Set up app message handler for chat
    callObject.on('app-message', handleAppMessage);

    // Poll network stats
    const statsInterval = setInterval(async () => {
      try {
        const stats = await callObject.getNetworkStats();
        if (stats?.stats) {
          const { latest } = stats.stats;
          if (latest) {
            setNetworkStats({
              bitrate: latest.videoSendBitsPerSecond || latest.videoRecvBitsPerSecond,
              packetLoss: latest.videoSendPacketLoss || latest.videoRecvPacketLoss,
            });

            // Determine quality based on packet loss
            const packetLoss = latest.videoSendPacketLoss || 0;
            if (packetLoss < 1) {
              setConnectionQuality('excellent');
            } else if (packetLoss < 3) {
              setConnectionQuality('good');
            } else if (packetLoss < 10) {
              setConnectionQuality('fair');
            } else {
              setConnectionQuality('poor');
            }
          }
        }
      } catch (err) {
        // Silently handle stats errors
      }
    }, 5000);

    return () => {
      callObject.off('app-message', handleAppMessage);
      clearInterval(statsInterval);
    };
  }, [callState, handleAppMessage]);

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
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
            Ready to Join?
          </h2>
          <p className="text-slate-600 mb-4 sm:mb-6">
            {isProvider
              ? `Session with ${childName}'s family`
              : `Session with ${providerName || 'your provider'}`}
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-4 sm:mb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span>{sessionType === '50min' ? '50 minute' : '25 minute'} session</span>
            </div>
          </div>

          <Alert className="mb-4 sm:mb-6 bg-blue-50 border-blue-200">
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
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
            Connection Error
          </h2>
          <p className="text-slate-600 mb-4 sm:mb-6">
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
          {isRecording && (
            <Badge className="bg-red-500 text-white animate-pulse">
              <Circle className="w-3 h-3 mr-1 fill-current" />
              REC
            </Badge>
          )}
          <span className="text-white text-sm hidden sm:inline">
            {isProvider ? `Session with ${childName}'s family` : `Session with ${providerName}`}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Connection quality */}
          <div className="flex items-center gap-1" title={`Connection: ${connectionQuality}`}>
            {getConnectionQualityIcon()}
            <span className="text-xs text-slate-400 hidden sm:inline capitalize">{connectionQuality}</span>
          </div>

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

      {/* Chat Panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-slate-800 border-l border-slate-700 flex flex-col z-50"
          >
            {/* Chat header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-white font-medium">Chat</h3>
              <button
                onClick={toggleChat}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <p className="text-center text-slate-500 text-sm">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.isLocal ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.isLocal
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      {!msg.isLocal && (
                        <p className="text-xs text-slate-300 mb-1">{msg.senderName}</p>
                      )}
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <Button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim()}
                  className="bg-teal-600 hover:bg-teal-700 rounded-lg"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="bg-slate-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 sm:gap-3">
          {/* Mic toggle */}
          <Button
            size="lg"
            variant={audioEnabled ? 'secondary' : 'destructive'}
            className="rounded-full w-12 h-12 sm:w-14 sm:h-14"
            onClick={toggleAudio}
            aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {audioEnabled ? (
              <Mic className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            ) : (
              <MicOff className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            )}
          </Button>

          {/* Video toggle */}
          <Button
            size="lg"
            variant={videoEnabled ? 'secondary' : 'destructive'}
            className="rounded-full w-12 h-12 sm:w-14 sm:h-14"
            onClick={toggleVideo}
            aria-label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {videoEnabled ? (
              <Video className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            ) : (
              <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            )}
          </Button>

          {/* Screen share */}
          <Button
            size="lg"
            variant={screenShareEnabled ? 'default' : 'secondary'}
            className={`rounded-full w-12 h-12 sm:w-14 sm:h-14 ${screenShareEnabled ? 'bg-teal-600' : ''}`}
            onClick={toggleScreenShare}
            aria-label={screenShareEnabled ? 'Stop screen sharing' : 'Share screen'}
          >
            {screenShareEnabled ? (
              <MonitorOff className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            ) : (
              <Monitor className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            )}
          </Button>

          {/* Chat toggle */}
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-12 h-12 sm:w-14 sm:h-14 relative"
            onClick={toggleChat}
            aria-label={chatOpen ? 'Close chat' : 'Open chat'}
          >
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* Recording (providers only) */}
          {isProvider && (
            <Button
              size="lg"
              variant={isRecording ? 'destructive' : 'secondary'}
              className={`rounded-full w-12 h-12 sm:w-14 sm:h-14 ${isRecording ? 'animate-pulse' : ''}`}
              onClick={toggleRecording}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <Circle className={`w-5 h-5 sm:w-6 sm:h-6 ${isRecording ? 'fill-current' : ''}`} aria-hidden="true" />
            </Button>
          )}

          {/* Speaker toggle */}
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-12 h-12 sm:w-14 sm:h-14 hidden sm:flex"
            onClick={() => setSpeakerEnabled(!speakerEnabled)}
            aria-label={speakerEnabled ? 'Mute speaker' : 'Unmute speaker'}
          >
            {speakerEnabled ? (
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            ) : (
              <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            )}
          </Button>

          {/* Fullscreen */}
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-12 h-12 sm:w-14 sm:h-14 hidden sm:flex"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            ) : (
              <Maximize2 className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            )}
          </Button>

          {/* End call */}
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-12 h-12 sm:w-14 sm:h-14 bg-red-600 hover:bg-red-700"
            onClick={leaveCall}
            aria-label="End call"
          >
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default VideoCall;
