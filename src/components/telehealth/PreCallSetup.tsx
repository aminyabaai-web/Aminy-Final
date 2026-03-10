import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  ArrowRight,
  Settings,
  ChevronDown
} from 'lucide-react';
import { Button } from '../ui/button';

interface PreCallSetupProps {
  appointmentId: string;
  providerName: string;
  appointmentTime: Date;
  onReady: () => void;
  onCancel: () => void;
}

interface DeviceStatus {
  camera: 'checking' | 'ready' | 'error' | 'denied';
  microphone: 'checking' | 'ready' | 'error' | 'denied';
  speaker: 'checking' | 'ready' | 'error';
  network: 'checking' | 'good' | 'fair' | 'poor';
}

interface NetworkTestResult {
  latencyMs: number;
  downloadMbps: number;
  effectiveType: string;
}

export function PreCallSetup({
  appointmentId,
  providerName,
  appointmentTime,
  onReady,
  onCancel
}: PreCallSetupProps) {
  const [status, setStatus] = useState<DeviceStatus>({
    camera: 'checking',
    microphone: 'checking',
    speaker: 'checking',
    network: 'checking'
  });

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }>({ cameras: [], microphones: [], speakers: [] });
  const [selectedDevices, setSelectedDevices] = useState<{
    camera: string;
    microphone: string;
    speaker: string;
  }>({ camera: '', microphone: '', speaker: '' });
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [testingAudio, setTestingAudio] = useState(false);
  const [networkTestResult, setNetworkTestResult] = useState<NetworkTestResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContext = useRef<AudioContext | null>(null);

  // Check all devices on mount
  useEffect(() => {
    checkDevices();
    checkNetworkQuality();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  async function checkDevices() {
    // Get list of devices
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const cameras = deviceList.filter(d => d.kind === 'videoinput');
      const microphones = deviceList.filter(d => d.kind === 'audioinput');
      const speakers = deviceList.filter(d => d.kind === 'audiooutput');

      setDevices({ cameras, microphones, speakers });

      // Set defaults
      if (cameras.length > 0) {
        setSelectedDevices(prev => ({ ...prev, camera: cameras[0].deviceId }));
      }
      if (microphones.length > 0) {
        setSelectedDevices(prev => ({ ...prev, microphone: microphones[0].deviceId }));
      }
      if (speakers.length > 0) {
        setSelectedDevices(prev => ({ ...prev, speaker: speakers[0].deviceId }));
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
    }

    // Request camera access
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setStream(mediaStream);
      setStatus(prev => ({
        ...prev,
        camera: 'ready',
        microphone: 'ready'
      }));
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      console.error('Error accessing media devices:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus(prev => ({
          ...prev,
          camera: 'denied',
          microphone: 'denied'
        }));
      } else {
        setStatus(prev => ({
          ...prev,
          camera: 'error',
          microphone: 'error'
        }));
      }
    }

    // Check speaker (simulate - actual test would require audio output check)
    setStatus(prev => ({ ...prev, speaker: 'ready' }));
  }

  async function checkNetworkQuality() {
    setStatus(prev => ({ ...prev, network: 'checking' }));
    setNetworkTestResult(null);

    try {
      // ---- Step 1: Latency test (multiple samples, take median) ----
      const latencySamples: number[] = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        await fetch('https://www.google.com/generate_204', { mode: 'no-cors' });
        latencySamples.push(performance.now() - start);
      }
      latencySamples.sort((a, b) => a - b);
      const medianLatency = latencySamples[1] ?? latencySamples[0];

      // ---- Step 2: Download bandwidth estimation ----
      // Fetch a known-size resource and measure throughput.
      // We use a Cloudflare endpoint that returns random bytes (100 KB).
      let downloadMbps = 0;
      try {
        const downloadStart = performance.now();
        const resp = await fetch(
          'https://speed.cloudflare.com/__down?bytes=102400',
          { cache: 'no-store' },
        );
        // Read the full body to ensure complete download
        if (resp.body) {
          const reader = resp.body.getReader();
          let totalBytes = 0;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.byteLength;
          }
          const downloadDuration = (performance.now() - downloadStart) / 1000; // seconds
          downloadMbps = totalBytes > 0
            ? (totalBytes * 8) / downloadDuration / 1_000_000
            : 0;
        }
      } catch {
        // Cloudflare endpoint may be blocked — fall back to latency-only estimation
        downloadMbps = 0;
      }

      // ---- Step 3: Network Information API (supplemental) ----
      const connection = (navigator as Navigator & {
        connection?: { effectiveType?: string; downlink?: number };
      }).connection;
      const effectiveType = connection?.effectiveType || 'unknown';
      const apiDownlink = connection?.downlink; // Mbps estimate from the browser

      // Use the better of measured vs API-reported bandwidth
      const bestBandwidth = Math.max(downloadMbps, apiDownlink ?? 0);

      // ---- Step 4: Composite quality determination ----
      // Good:  latency < 100ms AND bandwidth >= 2 Mbps
      // Fair:  latency < 250ms AND bandwidth >= 0.5 Mbps
      // Poor:  everything else
      let quality: 'good' | 'fair' | 'poor';

      if (medianLatency < 100 && bestBandwidth >= 2) {
        quality = 'good';
      } else if (medianLatency < 250 && bestBandwidth >= 0.5) {
        quality = 'fair';
      } else if (bestBandwidth === 0 && medianLatency < 150) {
        // Speed test failed but latency is okay — be generous
        quality = effectiveType === '4g' ? 'good' : 'fair';
      } else {
        quality = 'poor';
      }

      setNetworkTestResult({
        latencyMs: Math.round(medianLatency),
        downloadMbps: Math.round(bestBandwidth * 10) / 10,
        effectiveType,
      });
      setStatus(prev => ({ ...prev, network: quality }));
    } catch {
      setNetworkTestResult(null);
      setStatus(prev => ({ ...prev, network: 'poor' }));
    }
  }

  function toggleVideo() {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  }

  function toggleAudio() {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  }

  async function testSpeaker() {
    setTestingAudio(true);

    try {
      // Create audio context and play a test tone
      audioContext.current = new AudioContext();
      const oscillator = audioContext.current.createOscillator();
      const gainNode = audioContext.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.current.destination);

      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.3;

      oscillator.start();

      setTimeout(() => {
        oscillator.stop();
        setTestingAudio(false);
      }, 1000);
    } catch (error) {
      console.error('Error testing speaker:', error);
      setTestingAudio(false);
    }
  }

  function getStatusIcon(statusValue: string) {
    switch (statusValue) {
      case 'ready':
      case 'good':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'fair':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
      case 'denied':
      case 'poor':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  }

  function getStatusText(statusValue: string, type: string) {
    switch (statusValue) {
      case 'ready':
        return `${type} is ready`;
      case 'good':
        return 'Connection is strong';
      case 'fair':
        return 'Connection is fair';
      case 'error':
        return `${type} not detected`;
      case 'denied':
        return `${type} access denied`;
      case 'poor':
        return 'Connection is weak';
      default:
        return `Checking ${type.toLowerCase()}...`;
    }
  }

  const allReady =
    (status.camera === 'ready' || status.camera === 'denied') &&
    (status.microphone === 'ready' || status.microphone === 'denied') &&
    status.speaker === 'ready' &&
    status.network !== 'checking';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Pre-Call Setup
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Session with {providerName} at {formatTime(appointmentTime)}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Video Preview */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="relative aspect-video bg-gray-900">
              {videoEnabled && stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center">
                    <VideoOff className="w-12 h-12 text-gray-500" />
                  </div>
                </div>
              )}

              {/* Video Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-3">
                <button
                  onClick={toggleAudio}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    audioEnabled
                      ? 'bg-gray-800/80 hover:bg-gray-700/80 text-white'
                      : 'bg-red-500/90 text-white'
                  }`}
                >
                  {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                <button
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    videoEnabled
                      ? 'bg-gray-800/80 hover:bg-gray-700/80 text-white'
                      : 'bg-red-500/90 text-white'
                  }`}
                >
                  {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Device Status */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Device Check</h2>
              <button
                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                className="flex items-center text-sm text-teal-600 dark:text-teal-400"
              >
                <Settings className="w-4 h-4 mr-1" />
                Settings
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showDeviceSettings ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {/* Camera */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    status.camera === 'ready' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-slate-700'
                  }`}>
                    <Video className={`w-5 h-5 ${
                      status.camera === 'ready' ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Camera</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getStatusText(status.camera, 'Camera')}
                    </p>
                  </div>
                </div>
                {getStatusIcon(status.camera)}
              </div>

              {/* Microphone */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    status.microphone === 'ready' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-slate-700'
                  }`}>
                    <Mic className={`w-5 h-5 ${
                      status.microphone === 'ready' ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Microphone</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getStatusText(status.microphone, 'Microphone')}
                    </p>
                  </div>
                </div>
                {getStatusIcon(status.microphone)}
              </div>

              {/* Speaker */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    status.speaker === 'ready' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-slate-700'
                  }`}>
                    <Volume2 className={`w-5 h-5 ${
                      status.speaker === 'ready' ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Speaker</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getStatusText(status.speaker, 'Speaker')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={testSpeaker}
                    disabled={testingAudio}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline disabled:opacity-50"
                  >
                    {testingAudio ? 'Playing...' : 'Test'}
                  </button>
                  {getStatusIcon(status.speaker)}
                </div>
              </div>

              {/* Network */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    status.network === 'good' ? 'bg-green-100 dark:bg-green-900/30' :
                    status.network === 'fair' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                    'bg-gray-100 dark:bg-slate-700'
                  }`}>
                    {status.network === 'poor' ? (
                      <WifiOff className="w-5 h-5 text-red-500" />
                    ) : (
                      <Wifi className={`w-5 h-5 ${
                        status.network === 'good' ? 'text-green-600 dark:text-green-400' :
                        status.network === 'fair' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-gray-500'
                      }`} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Network</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getStatusText(status.network, 'Network')}
                    </p>
                    {networkTestResult && status.network !== 'checking' && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {networkTestResult.latencyMs}ms latency
                        {networkTestResult.downloadMbps > 0 && (
                          <> &middot; {networkTestResult.downloadMbps} Mbps down</>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={checkNetworkQuality}
                    disabled={status.network === 'checking'}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline disabled:opacity-50"
                  >
                    {status.network === 'checking' ? 'Testing...' : 'Retest'}
                  </button>
                  {getStatusIcon(status.network)}
                </div>
              </div>
            </div>

            {/* Device Settings Dropdown */}
            {showDeviceSettings && devices.cameras.length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-slate-900 space-y-3 sm:space-y-4">
                {/* Camera Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Camera
                  </label>
                  <select
                    value={selectedDevices.camera}
                    onChange={(e) => setSelectedDevices(prev => ({ ...prev, camera: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    {devices.cameras.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${devices.cameras.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Microphone Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Microphone
                  </label>
                  <select
                    value={selectedDevices.microphone}
                    onChange={(e) => setSelectedDevices(prev => ({ ...prev, microphone: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    {devices.microphones.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${devices.microphones.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Speaker Selection (if supported) */}
                {devices.speakers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Speaker
                    </label>
                    <select
                      value={selectedDevices.speaker}
                      onChange={(e) => setSelectedDevices(prev => ({ ...prev, speaker: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    >
                      {devices.speakers.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Speaker ${devices.speakers.indexOf(device) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tips */}
          {status.network === 'poor' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Weak connection detected</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Try moving closer to your router or switching to a wired connection for better video quality.
                  </p>
                </div>
              </div>
            </div>
          )}

          {(status.camera === 'denied' || status.microphone === 'denied') && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Permission denied</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Please allow camera and microphone access in your browser settings to join the video call.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-4">
        <div className="max-w-2xl mx-auto flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>

          <Button
            onClick={onReady}
            disabled={!allReady}
            className="flex-1 py-3 min-h-[48px] bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Call
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Safe area padding */}
        <div style={{ height: 'max(8px, env(safe-area-inset-bottom))' }} />
      </div>
    </div>
  );
}

export default PreCallSetup;
