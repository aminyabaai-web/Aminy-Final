// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Vision AI Component
 * Photo analysis (Core+) and live video analysis (Pro+)
 * Camera capture → GPT-4o Vision → behavioral insights
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera, Video, VideoOff, Image, Loader2, Send,
  Eye, Clock, BarChart3, X, ChevronDown,
  Sparkles, Lock, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { syncEncryptedStorage } from '../lib/security/encrypted-storage';
import {
  analyzePhoto,
  startVideoSession,
  analyzeFrame,
  getSessionSummary,
  endVideoSession,
  getActiveSession,
  canUseVideoAI,
  getFrameLimit,
  type VisionAnalysisResult,
  type VideoSession,
  type VisionTier,
} from '../lib/vision-ai-service';

interface VisionAIProps {
  tier: VisionTier;
  userId?: string;
  onClose?: () => void;
  onBack?: () => void;
  /** Called with analysis text when photo/video analysis completes */
  onAnalysisComplete?: (result: { type: 'photo' | 'video_summary'; analysis: string }) => void;
  /** If provided, analyze this image immediately */
  initialImage?: string;
}

type Mode = 'photo' | 'video';

export function VisionAI({ tier, userId, onClose, onBack, onAnalysisComplete, initialImage }: VisionAIProps) {
  const effectiveUserId = userId || syncEncryptedStorage.getItem('aminy-user-id') || 'anonymous';
  const handleClose = onBack || onClose || (() => {});
  const [mode, setMode] = useState<Mode>('photo');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [photoResult, setPhotoResult] = useState<VisionAnalysisResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(initialImage || null);
  const [cameraActive, setCameraActive] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);

  // Video state
  const [videoSession, setVideoSession] = useState<VideoSession | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [frameResults, setFrameResults] = useState<VisionAnalysisResult[]>([]);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dontStore, setDontStore] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const videoAllowed = canUseVideoAI(tier);
  const maxFrames = getFrameLimit(tier);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, []);

  // Auto-analyze initial image
  useEffect(() => {
    if (initialImage && !photoResult) {
      handleAnalyzePhoto(initialImage);
    }
  }, [initialImage]);

  // ── Camera ──────────────────────────────────────────────────

  const startCamera = useCallback(async (facing: 'user' | 'environment' = 'environment') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      toast.error('Camera access denied. Please allow camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  // ── Photo Mode ──────────────────────────────────────────────

  const handleCapturePhoto = useCallback(() => {
    const frame = captureFrame();
    if (frame) {
      setCapturedImage(frame);
      stopCamera();
    }
  }, [captureFrame, stopCamera]);

  const handleAnalyzePhoto = useCallback(async (imageData?: string) => {
    const img = imageData || capturedImage;
    if (!img) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzePhoto(img, customPrompt || undefined, effectiveUserId, dontStore);
      setPhotoResult(result);
      if (result && onAnalysisComplete) {
        onAnalysisComplete({ type: 'photo', analysis: result.analysis });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't analyze the image right now — please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [capturedImage, customPrompt, effectiveUserId, dontStore, onAnalysisComplete]);

  const resetPhoto = () => {
    setCapturedImage(null);
    setPhotoResult(null);
    setCustomPrompt('');
  };

  // ── Video Mode ──────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (!videoAllowed) {
      toast.error('Video AI requires Pro or Pro+ subscription');
      return;
    }

    await startCamera('environment');
    const session = startVideoSession(effectiveUserId, tier, dontStore);
    setVideoSession(session);
    setIsRecording(true);
    setFrameResults([]);
    setSessionSummary(null);

    // Capture frames every 3 seconds
    frameIntervalRef.current = setInterval(async () => {
      const frame = captureFrame();
      if (!frame) return;

      const activeSession = getActiveSession(session.id);
      if (!activeSession || activeSession.totalFrames >= activeSession.maxFrames) {
        // Max frames reached
        if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
        toast.info(`Maximum ${maxFrames} frames reached. Generating summary...`);
        stopRecording(session.id);
        return;
      }

      const result = await analyzeFrame(session.id, frame);
      if (result) {
        setFrameResults(prev => [...prev, result]);
      }
    }, 3000);
  }, [videoAllowed, effectiveUserId, tier, maxFrames, dontStore, startCamera, captureFrame]);

  const stopRecording = useCallback(async (sessionId?: string) => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    stopCamera();
    setIsRecording(false);

    const id = sessionId || videoSession?.id;
    if (id) {
      endVideoSession(id);
      setSummaryLoading(true);
      const summary = await getSessionSummary(id);
      setSessionSummary(summary);
      setSummaryLoading(false);
      if (summary && onAnalysisComplete) {
        onAnalysisComplete({ type: 'video_summary', analysis: summary });
      }
    }
  }, [videoSession, stopCamera, onAnalysisComplete]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 flex items-center gap-3">
        {(onClose || onBack) && (
          <button onClick={handleClose} aria-label="Close Vision AI" className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5" /> Vision AI
          </h2>
          <p className="text-xs text-white/70">
            {mode === 'photo' ? 'Analyze photos for insights' : 'Live behavioral observation'}
          </p>
        </div>
        {/* Mode toggle */}
        <div className="flex bg-white/20 rounded-lg p-0.5">
          <button
            onClick={() => { setMode('photo'); if (isRecording) stopRecording(); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'photo' ? 'bg-white text-violet-700' : 'text-white'
            }`}
          >
            <Image className="w-3.5 h-3.5 inline mr-1" /> Photo
          </button>
          <button
            onClick={() => videoAllowed ? setMode('video') : toast.error('Video AI requires Pro+ tier')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'video' ? 'bg-white text-violet-700' : 'text-white'
            } ${!videoAllowed ? 'opacity-50' : ''}`}
          >
            <Video className="w-3.5 h-3.5 inline mr-1" /> Video
            {!videoAllowed && <Lock className="w-3 h-3 inline ml-1" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {/* ── Photo Mode ─────────────────────────────── */}
          {mode === 'photo' && (
            <motion.div key="photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Camera preview or captured image */}
              {cameraActive && !capturedImage && (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute bottom-4 inset-x-0 flex justify-center">
                    <button
                      onClick={handleCapturePhoto}
                      className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                    >
                      <Camera className="w-7 h-7 text-gray-700" />
                    </button>
                  </div>
                </div>
              )}

              {capturedImage && (
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <img src={capturedImage} alt="Captured for analysis" className="w-full rounded-xl" />
                  <button
                    onClick={resetPhoto}
                    aria-label="Remove photo"
                    className="absolute top-2 right-2 p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center bg-black/50 text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!cameraActive && !capturedImage && (
                <div className="bg-gradient-to-b from-violet-50 to-white rounded-xl border border-violet-100 p-8 text-center">
                  <Sparkles className="w-12 h-12 text-violet-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Photo Analysis</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Take a photo of a document (IEP, prescription), your child's activity,
                    or anything you'd like Aminy to analyze.
                  </p>
                  <button
                    onClick={() => startCamera('environment')}
                    className="px-6 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 flex items-center gap-2 mx-auto"
                  >
                    <Camera className="w-5 h-5" /> Open Camera
                  </button>
                </div>
              )}

              {/* Custom prompt */}
              {capturedImage && !photoResult && (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowPromptInput(!showPromptInput)}
                    className="text-sm text-violet-600 flex items-center gap-1"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showPromptInput ? 'rotate-180' : ''}`} />
                    Add a specific question (optional)
                  </button>
                  {showPromptInput && (
                    <input
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g., 'What does this IEP section mean?' or 'Is this behavior typical?'"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  )}
                  <button
                    onClick={() => handleAnalyzePhoto()}
                    disabled={isAnalyzing}
                    className="w-full py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Analyze Photo</>
                    )}
                  </button>
                </div>
              )}

              {/* Photo result */}
              {photoResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-violet-50 border border-violet-200 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    <p className="font-medium text-violet-800 text-sm">AI Analysis</p>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {photoResult.analysis}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={resetPhoto}
                      className="px-3 py-1.5 text-xs font-medium text-violet-600 border border-violet-300 rounded-lg hover:bg-violet-100"
                    >
                      Analyze Another
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Video Mode ─────────────────────────────── */}
          {mode === 'video' && (
            <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Privacy toggle — locked once a session is recording */}
              <label className={`flex items-center gap-2 text-sm text-gray-600 ${isRecording ? 'opacity-60' : ''}`}>
                <input
                  type="checkbox"
                  checked={dontStore}
                  disabled={isRecording}
                  onChange={(e) => setDontStore(e.target.checked)}
                  className="w-4 h-4 text-violet-600 rounded border-gray-300 disabled:cursor-not-allowed"
                />
                Don't store frames (process and discard immediately)
              </label>

              {/* Recording view */}
              {isRecording && (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {/* Recording indicator */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      Recording
                    </div>
                    {/* Frame counter */}
                    <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs">
                      {videoSession ? `${frameResults.length}/${maxFrames} frames` : ''}
                    </div>
                  </div>

                  <button
                    onClick={() => stopRecording()}
                    className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <VideoOff className="w-4 h-4" /> Stop Recording
                  </button>

                  {/* Live frame results */}
                  {frameResults.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">Live Analysis</p>
                      {frameResults.slice(-3).map(fr => (
                        <div key={fr.id} className="bg-gray-50 rounded-lg p-2 text-xs text-gray-600">
                          <span className="text-gray-400">Frame {(fr.frameIndex ?? 0) + 1}:</span>{' '}
                          {fr.analysis.length > 100 ? fr.analysis.slice(0, 100) + '...' : fr.analysis}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Not recording — show start or summary */}
              {!isRecording && !sessionSummary && !summaryLoading && (
                <div className="bg-gradient-to-b from-violet-50 to-white rounded-xl border border-violet-100 p-8 text-center">
                  <Video className="w-12 h-12 text-violet-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Video Observation</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    Record your child's activity for AI behavioral analysis.
                    Captures 1 frame every 3 seconds.
                  </p>
                  <p className="text-xs text-gray-400 mb-6">
                    {tier === 'pro' ? '10 frames per session (Pro)' :
                     tier === 'pro_plus' ? '20 frames per session (Pro+)' :
                     'Unlimited frames (Enterprise)'}
                  </p>
                  <button
                    onClick={startRecording}
                    className="px-6 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 flex items-center gap-2 mx-auto"
                  >
                    <Video className="w-5 h-5" /> Start Recording
                  </button>
                </div>
              )}

              {/* Summary loading */}
              {summaryLoading && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-violet-600 animate-spin mx-auto mb-3" />
                  <p className="font-medium text-gray-900">Generating session summary...</p>
                  <p className="text-sm text-gray-500">Analyzing {frameResults.length} frames</p>
                </div>
              )}

              {/* Session Summary */}
              {sessionSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-violet-600" />
                      <p className="font-medium text-violet-800 text-sm">Session Summary</p>
                      <span className="text-xs text-violet-500 ml-auto">
                        {frameResults.length} frames analyzed
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {sessionSummary}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setVideoSession(null);
                      setFrameResults([]);
                      setSessionSummary(null);
                    }}
                    className="w-full py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 flex items-center justify-center gap-2"
                  >
                    <Video className="w-4 h-4" /> New Session
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default VisionAI;
