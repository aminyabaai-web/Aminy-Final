// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Pre-Call Setup Component
 *
 * Device testing and configuration before joining a video call
 * Tests camera, microphone, and speakers
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  RefreshCw,
  Play,
  ArrowRight,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PreCallSetupProps {
  onReady: () => void;
  onCancel: () => void;
  providerName?: string;
  appointmentTime?: string;
}

interface MediaDevice {
  deviceId: string;
  label: string;
}

interface DeviceStatus {
  camera: 'pending' | 'testing' | 'success' | 'error';
  microphone: 'pending' | 'testing' | 'success' | 'error';
  speaker: 'pending' | 'testing' | 'success' | 'error';
  network: 'pending' | 'testing' | 'success' | 'warning' | 'error';
}

export function PreCallSetup({
  onReady,
  onCancel,
  providerName,
  appointmentTime,
}: PreCallSetupProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Device lists
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [microphones, setMicrophones] = useState<MediaDevice[]>([]);
  const [speakers, setSpeakers] = useState<MediaDevice[]>([]);

  // Selected devices
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');

  // Status
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    camera: 'pending',
    microphone: 'pending',
    speaker: 'pending',
    network: 'pending',
  });
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Video preview state
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Get available media devices
  const getDevices = useCallback(async () => {
    try {
      // First request permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Stop the stream (we just needed it for permissions)
      stream.getTracks().forEach(track => track.stop());

      // Now enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();

      const videoDevices = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}` }));

      const audioInputs = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 5)}` }));

      const audioOutputs = devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 5)}` }));

      setCameras(videoDevices);
      setMicrophones(audioInputs);
      setSpeakers(audioOutputs);

      // Set defaults
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
      if (audioInputs.length > 0 && !selectedMicrophone) {
        setSelectedMicrophone(audioInputs[0].deviceId);
      }
      if (audioOutputs.length > 0 && !selectedSpeaker) {
        setSelectedSpeaker(audioOutputs[0].deviceId);
      }
    } catch (err) {
      console.error('Error getting devices:', err);
      setError('Unable to access camera or microphone. Please check your browser permissions.');
    }
  }, [selectedCamera, selectedMicrophone, selectedSpeaker]);

  // Initialize devices on mount
  useEffect(() => {
    getDevices();
    return () => {
      // Cleanup media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [getDevices]);

  // Start video preview
  const startVideoPreview = useCallback(async () => {
    try {
      setDeviceStatus(prev => ({ ...prev, camera: 'testing' }));

      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCamera
          ? { deviceId: { exact: selectedCamera } }
          : true,
        audio: selectedMicrophone
          ? { deviceId: { exact: selectedMicrophone } }
          : true,
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setDeviceStatus(prev => ({
        ...prev,
        camera: 'success',
        microphone: 'testing',
      }));

      // Start audio level monitoring
      startAudioMonitoring(stream);
    } catch (err) {
      console.error('Error starting preview:', err);
      setDeviceStatus(prev => ({ ...prev, camera: 'error', microphone: 'error' }));
      setError('Unable to access camera or microphone.');
    }
  }, [selectedCamera, selectedMicrophone]);

  // Start audio level monitoring
  const startAudioMonitoring = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const checkAudioLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(100, average * 2));

        // If we detect audio, mark microphone as success
        if (average > 5) {
          setDeviceStatus(prev => ({ ...prev, microphone: 'success' }));
        }

        requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
      setDeviceStatus(prev => ({ ...prev, microphone: 'success' }));
    } catch (err) {
      console.error('Error starting audio monitoring:', err);
      setDeviceStatus(prev => ({ ...prev, microphone: 'error' }));
    }
  }, []);

  // Test speaker
  const testSpeaker = useCallback(async () => {
    setDeviceStatus(prev => ({ ...prev, speaker: 'testing' }));

    try {
      // Create a simple beep sound
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
        setDeviceStatus(prev => ({ ...prev, speaker: 'success' }));
      }, 500);
    } catch (err) {
      console.error('Error testing speaker:', err);
      setDeviceStatus(prev => ({ ...prev, speaker: 'error' }));
    }
  }, []);

  // Test network quality
  const testNetwork = useCallback(async () => {
    setDeviceStatus(prev => ({ ...prev, network: 'testing' }));

    try {
      const startTime = Date.now();
      await fetch('https://www.google.com/generate_204', { mode: 'no-cors' });
      const latency = Date.now() - startTime;

      if (latency < 100) {
        setDeviceStatus(prev => ({ ...prev, network: 'success' }));
      } else if (latency < 300) {
        setDeviceStatus(prev => ({ ...prev, network: 'warning' }));
      } else {
        setDeviceStatus(prev => ({ ...prev, network: 'error' }));
      }
    } catch (err) {
      setDeviceStatus(prev => ({ ...prev, network: 'error' }));
    }
  }, []);

  // Start all tests
  useEffect(() => {
    if (selectedCamera && selectedMicrophone) {
      startVideoPreview();
      testNetwork();
    }
  }, [selectedCamera, selectedMicrophone, startVideoPreview, testNetwork]);

  // Check if all tests passed
  useEffect(() => {
    const allPassed =
      deviceStatus.camera === 'success' &&
      deviceStatus.microphone === 'success' &&
      (deviceStatus.speaker === 'success' || deviceStatus.speaker === 'pending') &&
      (deviceStatus.network === 'success' || deviceStatus.network === 'warning');

    setIsReady(allPassed);
  }, [deviceStatus]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  }, [videoEnabled]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  }, [audioEnabled]);

  // Render status badge
  const renderStatusBadge = (status: DeviceStatus[keyof DeviceStatus]) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Waiting</Badge>;
      case 'testing':
        return (
          <Badge variant="secondary" className="text-xs">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Testing
          </Badge>
        );
      case 'success':
        return (
          <Badge className="bg-green-100 text-green-800 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ready
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-amber-100 text-amber-800 text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Slow
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Pre-Call Setup
          </CardTitle>
          {providerName && appointmentTime && (
            <p className="text-sm text-muted-foreground">
              Preparing for your session with {providerName} at {appointmentTime}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Video Preview */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover",
                !videoEnabled && "hidden"
              )}
            />
            {!videoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <VideoOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm opacity-75">Camera off</p>
                </div>
              </div>
            )}

            {/* Video controls overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                variant={videoEnabled ? "secondary" : "destructive"}
                size="icon"
                onClick={toggleVideo}
                className="rounded-full"
              >
                {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </Button>
              <Button
                variant={audioEnabled ? "secondary" : "destructive"}
                size="icon"
                onClick={toggleAudio}
                className="rounded-full"
              >
                {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Audio Level Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Microphone Level
              </span>
              <span className="text-muted-foreground">{Math.round(audioLevel)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-100 rounded-full",
                  audioLevel > 50 ? "bg-green-500" :
                  audioLevel > 20 ? "bg-amber-500" : "bg-gray-400"
                )}
                style={{ width: `${audioLevel}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Speak to test your microphone
            </p>
          </div>

          {/* Device Status Checklist */}
          <div className="space-y-3 border rounded-lg p-4">
            <h4 className="font-medium text-sm">Device Check</h4>

            <div className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="flex items-center gap-2 text-sm">
                <Video className="w-4 h-4" />
                Camera
              </span>
              {renderStatusBadge(deviceStatus.camera)}
            </div>

            <div className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="flex items-center gap-2 text-sm">
                <Mic className="w-4 h-4" />
                Microphone
              </span>
              {renderStatusBadge(deviceStatus.microphone)}
            </div>

            <div className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="flex items-center gap-2 text-sm">
                <Volume2 className="w-4 h-4" />
                Speaker
              </span>
              <div className="flex items-center gap-2">
                {renderStatusBadge(deviceStatus.speaker)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={testSpeaker}
                  className="h-7 text-xs"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Test
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm">
                <RefreshCw className="w-4 h-4" />
                Network
              </span>
              {renderStatusBadge(deviceStatus.network)}
            </div>
          </div>

          {/* Device Selection */}
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Camera</label>
              <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                <SelectTrigger aria-label="Camera">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map(camera => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Microphone</label>
              <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
                <SelectTrigger aria-label="Microphone">
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {microphones.map(mic => (
                    <SelectItem key={mic.deviceId} value={mic.deviceId}>
                      {mic.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={onReady}
              disabled={!isReady}
              className="flex-1"
            >
              {isReady ? (
                <>
                  Join Call
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PreCallSetup;
