// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider Identity Verification
 * Step-by-step identity verification: ID photos, selfie, SSN last 4, consent
 * Camera capture with Supabase Storage (or localStorage fallback)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera, Shield, CheckCircle2, XCircle, Upload,
  ArrowRight, ArrowLeft, Loader2, Lock, FileText,
  AlertTriangle, RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type BackgroundCheckState,
  type VerificationStep,
  getBackgroundCheckState,
  saveBackgroundCheckState,
  uploadVerificationImage,
  submitBackgroundCheck,
  checkBackgroundCheckStatus,
} from '../lib/background-check-service';

interface ProviderIdentityVerificationProps {
  providerId: string;
  onComplete: () => void;
  onBack: () => void;
}

type ActiveCapture = 'id_front' | 'id_back' | 'selfie' | null;

export function ProviderIdentityVerification({
  providerId,
  onComplete,
  onBack,
}: ProviderIdentityVerificationProps) {
  const [state, setState] = useState<BackgroundCheckState>(() =>
    getBackgroundCheckState(providerId)
  );
  const [activeCapture, setActiveCapture] = useState<ActiveCapture>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [ssnInput, setSsnInput] = useState('');
  const [showSsn, setShowSsn] = useState(false);
  const [consentChecked, setConsentChecked] = useState(state.consentGiven);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captureLoading, setCaptureLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Persist state changes
  useEffect(() => {
    saveBackgroundCheckState(state);
  }, [state]);

  // Poll status if processing
  useEffect(() => {
    if (state.status !== 'processing') return;
    const interval = setInterval(async () => {
      const newStatus = await checkBackgroundCheckStatus(providerId);
      if (newStatus !== state.status) {
        setState(prev => ({ ...prev, status: newStatus }));
        if (newStatus === 'approved') {
          toast.success('Background check approved!');
          clearInterval(interval);
        } else if (newStatus === 'denied') {
          toast.error('Background check was not approved.');
          clearInterval(interval);
        }
      }
    }, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [state.status, providerId]);

  // Start camera
  const startCamera = useCallback(async (captureType: ActiveCapture) => {
    try {
      const facingMode = captureType === 'selfie' ? 'user' : 'environment';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setActiveCapture(captureType);
      // Attach stream to video after render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { /* autoplay may be blocked; user can still capture */ });
        }
      }, 100);
    } catch {
      toast.error('Camera access denied. Please allow camera permissions.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setActiveCapture(null);
  }, [cameraStream]);

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !activeCapture) return;
    setCaptureLoading(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror selfie
    if (activeCapture === 'selfie') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.85);

    const stepId = activeCapture === 'selfie' ? 'selfie'
      : activeCapture === 'id_front' ? 'id_front' : 'id_back';
    const stepLabel = stepId === 'selfie' ? 'Selfie' : 'ID photo';

    try {
      const { success, url, error } = await uploadVerificationImage(
        providerId, activeCapture, imageData
      );

      if (success) {
        // Image durably uploaded (or a clearly-flagged demo stub). Persist the
        // real returned reference — never a fabricated 'uploaded' placeholder.
        setState(prev => ({
          ...prev,
          steps: prev.steps.map(s =>
            s.id === stepId ? { ...s, status: 'complete' as const } : s
          ),
          ...(activeCapture === 'id_front' ? { idFrontUrl: url } : {}),
          ...(activeCapture === 'id_back' ? { idBackUrl: url } : {}),
          ...(activeCapture === 'selfie' ? { selfieUrl: url } : {}),
          status: prev.status === 'not_started' ? 'id_uploaded' as const : prev.status,
        }));

        toast.success(`${stepLabel} captured!`);
        stopCamera();
      } else {
        // Upload did NOT durably persist — mark the step failed, clear any
        // stale url, and keep submit blocked. Do not show a false success.
        setState(prev => ({
          ...prev,
          steps: prev.steps.map(s =>
            s.id === stepId ? { ...s, status: 'failed' as const } : s
          ),
          ...(activeCapture === 'id_front' ? { idFrontUrl: undefined } : {}),
          ...(activeCapture === 'id_back' ? { idBackUrl: undefined } : {}),
          ...(activeCapture === 'selfie' ? { selfieUrl: undefined } : {}),
        }));
        toast.error(error ? `Upload failed — please retry (${error})` : 'Upload failed — please retry');
      }
    } catch (e) {
      setState(prev => ({
        ...prev,
        steps: prev.steps.map(s =>
          s.id === stepId ? { ...s, status: 'failed' as const } : s
        ),
      }));
      toast.error('Upload failed — please retry');
    } finally {
      setCaptureLoading(false);
    }
  }, [activeCapture, providerId, stopCamera]);

  // Handle SSN submit
  const handleSsnSubmit = () => {
    if (ssnInput.length !== 4 || !/^\d{4}$/.test(ssnInput)) {
      toast.error('Please enter exactly 4 digits');
      return;
    }
    setState(prev => ({
      ...prev,
      ssnLast4: ssnInput,
      steps: prev.steps.map(s =>
        s.id === 'ssn' ? { ...s, status: 'complete' as const } : s
      ),
      status: 'info_submitted',
    }));
    toast.success('SSN saved (encrypted)');
  };

  // Handle consent
  const handleConsent = () => {
    if (!consentChecked) {
      toast.error('Please check the consent box');
      return;
    }
    setState(prev => ({
      ...prev,
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
      steps: prev.steps.map(s =>
        s.id === 'consent' ? { ...s, status: 'complete' as const } : s
      ),
      status: 'consent_given',
    }));
    toast.success('Consent recorded');
  };

  // Submit background check
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const result = await submitBackgroundCheck(state);
    setIsSubmitting(false);

    if (result.success) {
      setState(prev => ({ ...prev, status: result.status }));
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const completedSteps = state.steps.filter(s => s.status === 'complete').length;
  const allComplete = state.steps.every(s => !s.required || s.status === 'complete');
  const isProcessingOrDone = ['processing', 'approved', 'denied', 'manual_review'].includes(state.status);

  // Step status icon
  const StepIcon = ({ step }: { step: VerificationStep }) => {
    if (step.status === 'complete') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (step.status === 'failed') return <XCircle className="w-5 h-5 text-red-500" />;
    return <div className="w-5 h-5 rounded-full border-2 border-[#E8E4DF]" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={onBack} aria-label="Go back" className="p-2 hover:bg-[#F0EDE8] rounded-lg">
            <ArrowLeft className="w-5 h-5 text-[#5A6B7A]" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-[#132F43]">Identity Verification</h1>
            <p className="text-sm text-[#5A6B7A]">
              {completedSteps}/{state.steps.length} steps complete
            </p>
          </div>
          <Shield className="w-6 h-6 text-[#6B9080]" />
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-3">
          <div className="h-2 bg-[#E8E4DF] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6B9080] rounded-full transition-all duration-500"
              style={{ width: `${(completedSteps / state.steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Processing / Approved / Denied status */}
        {isProcessingOrDone && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border ${
              state.status === 'approved' ? 'bg-green-50 border-green-200' :
              state.status === 'denied' ? 'bg-red-50 border-red-200' :
              'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {state.status === 'approved' && <CheckCircle2 className="w-6 h-6 text-green-600" />}
              {state.status === 'denied' && <XCircle className="w-6 h-6 text-red-600" />}
              {state.status === 'processing' && <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />}
              {state.status === 'manual_review' && <AlertTriangle className="w-6 h-6 text-amber-600" />}
              <div>
                <p className="font-semibold text-[#132F43]">
                  {state.status === 'approved' && 'Verification Approved'}
                  {state.status === 'denied' && 'Verification Not Approved'}
                  {state.status === 'processing' && 'Verification Processing'}
                  {state.status === 'manual_review' && 'Under Manual Review'}
                </p>
                <p className="text-sm text-[#5A6B7A]">
                  {state.status === 'approved' && 'You are cleared to accept clients on Aminy.'}
                  {state.status === 'denied' && (state.denialReason || 'Contact support@aminy.ai for details.')}
                  {state.status === 'processing' && 'Typically takes 1-3 business days. We\'ll notify you.'}
                  {state.status === 'manual_review' && 'A team member is reviewing your submission.'}
                </p>
              </div>
            </div>
            {state.status === 'approved' && (
              <button
                onClick={onComplete}
                className="mt-3 w-full py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700"
              >
                Continue to Marketplace
              </button>
            )}
          </motion.div>
        )}

        {/* Camera Capture Modal */}
        <AnimatePresence>
          {activeCapture && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black flex flex-col"
            >
              <div className="flex items-center justify-between p-4">
                <button onClick={stopCamera} aria-label="Close camera" className="text-white p-2">
                  <XCircle className="w-6 h-6" />
                </button>
                <p className="text-white font-medium">
                  {activeCapture === 'id_front' && 'Front of ID'}
                  {activeCapture === 'id_back' && 'Back of ID'}
                  {activeCapture === 'selfie' && 'Selfie'}
                </p>
                <div className="w-10" />
              </div>

              <div className="flex-1 relative flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="max-h-full max-w-full"
                  style={activeCapture === 'selfie' ? { transform: 'scaleX(-1)' } : undefined}
                />
                {/* Overlay guide */}
                {activeCapture !== 'selfie' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[80%] border-2 border-white/50 rounded-xl" style={{ aspectRatio: '1.585 / 1' }} />
                  </div>
                )}
                {activeCapture === 'selfie' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-white/50 rounded-full" />
                  </div>
                )}
              </div>

              <div className="p-6 flex justify-center">
                <button
                  onClick={capturePhoto}
                  disabled={captureLoading}
                  aria-label="Capture photo"
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                  {captureLoading ? (
                    <Loader2 className="w-8 h-8 text-[#3A4A57] animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-[#3A4A57]" />
                  )}
                </button>
              </div>

              <p className="text-center text-white/70 text-sm pb-4">
                {activeCapture === 'selfie'
                  ? 'Position your face in the circle and tap to capture'
                  : 'Align your ID within the frame and tap to capture'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Step Checklist */}
        {!isProcessingOrDone && (
          <div className="space-y-3">
            {state.steps.map((step) => (
              <div
                key={step.id}
                className={`bg-white rounded-xl border p-4 ${
                  step.status === 'complete' ? 'border-green-200' : 'border-[#E8E4DF]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <StepIcon step={step} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[#132F43]">{step.label}</p>
                    <p className="text-sm text-[#5A6B7A] mt-0.5">{step.description}</p>

                    {/* ID Front capture button */}
                    {step.id === 'id_front' && step.status !== 'complete' && (
                      <>
                        {step.status === 'failed' && (
                          <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Upload failed — please retry
                          </p>
                        )}
                        <button
                          onClick={() => startCamera('id_front')}
                          className="mt-3 flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-[#216982]"
                        >
                          <Camera className="w-4 h-4" /> {step.status === 'failed' ? 'Retake Photo' : 'Take Photo'}
                        </button>
                      </>
                    )}
                    {step.id === 'id_front' && step.status === 'complete' && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-green-600 font-medium">Captured</span>
                        <button
                          onClick={() => startCamera('id_front')}
                          className="text-sm text-[#6B9080] flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Retake
                        </button>
                      </div>
                    )}

                    {/* ID Back capture button */}
                    {step.id === 'id_back' && step.status !== 'complete' && (
                      <>
                        {step.status === 'failed' && (
                          <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Upload failed — please retry
                          </p>
                        )}
                        <button
                          onClick={() => startCamera('id_back')}
                          className="mt-3 flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-[#216982]"
                        >
                          <Camera className="w-4 h-4" /> {step.status === 'failed' ? 'Retake Photo' : 'Take Photo'}
                        </button>
                      </>
                    )}
                    {step.id === 'id_back' && step.status === 'complete' && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-green-600 font-medium">Captured</span>
                        <button
                          onClick={() => startCamera('id_back')}
                          className="text-sm text-[#6B9080] flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Retake
                        </button>
                      </div>
                    )}

                    {/* Selfie capture button */}
                    {step.id === 'selfie' && step.status !== 'complete' && (
                      <>
                        {step.status === 'failed' && (
                          <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Upload failed — please retry
                          </p>
                        )}
                        <button
                          onClick={() => startCamera('selfie')}
                          className="mt-3 flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-[#216982]"
                        >
                          <Camera className="w-4 h-4" /> {step.status === 'failed' ? 'Retake Selfie' : 'Take Selfie'}
                        </button>
                      </>
                    )}
                    {step.id === 'selfie' && step.status === 'complete' && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-green-600 font-medium">Captured</span>
                        <button
                          onClick={() => startCamera('selfie')}
                          className="text-sm text-[#6B9080] flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Retake
                        </button>
                      </div>
                    )}

                    {/* SSN last 4 input */}
                    {step.id === 'ssn' && step.status !== 'complete' && (
                      <div className="mt-3 flex gap-2">
                        <div className="relative flex-1 max-w-[160px]">
                          <input
                            type={showSsn ? 'text' : 'password'}
                            value={ssnInput}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setSsnInput(val);
                            }}
                            placeholder="••••"
                            maxLength={4}
                            aria-label="Last 4 digits of SSN"
                            style={{ letterSpacing: '0.25em' }}
                            className="w-full px-3 py-2 border border-[#E8E4DF] rounded-lg text-center text-lg font-mono focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => setShowSsn(!showSsn)}
                            aria-label={showSsn ? 'Hide SSN digits' : 'Show SSN digits'}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A9BA8]"
                          >
                            {showSsn ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <button
                          onClick={handleSsnSubmit}
                          disabled={ssnInput.length !== 4}
                          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-[#216982] disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    )}
                    {step.id === 'ssn' && step.status === 'complete' && (
                      <p className="mt-2 text-sm text-green-600 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Encrypted & saved
                      </p>
                    )}

                    {/* Consent form */}
                    {step.id === 'consent' && step.status !== 'complete' && (
                      <div className="mt-3 space-y-3">
                        <div className="bg-[#FAF7F2] rounded-lg p-3 text-sm text-[#5A6B7A] max-h-32 overflow-y-auto">
                          <p className="font-semibold mb-1">Background Check Authorization</p>
                          <p>I hereby authorize Aminy and its designated background check provider
                          to conduct a background check, which may include criminal history,
                          sex offender registry, professional license verification, and identity
                          verification. I understand this information will be used solely for
                          the purpose of verifying my eligibility to provide services through
                          the Aminy platform. I certify that all information provided is true
                          and accurate. I understand that providing false information may result
                          in denial of my application.</p>
                        </div>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={consentChecked}
                            onChange={(e) => setConsentChecked(e.target.checked)}
                            className="mt-0.5 w-4 h-4 text-[#6B9080] rounded border-[#E8E4DF] focus:ring-cyan-500"
                          />
                          <span className="text-sm text-[#3A4A57]">
                            I have read and agree to the background check authorization above
                          </span>
                        </label>
                        <button
                          onClick={handleConsent}
                          disabled={!consentChecked}
                          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-[#216982] disabled:opacity-40"
                        >
                          Sign & Consent
                        </button>
                      </div>
                    )}
                    {step.id === 'consent' && step.status === 'complete' && (
                      <p className="mt-2 text-sm text-green-600 font-medium flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Consent signed {state.consentTimestamp &&
                          `on ${new Date(state.consentTimestamp).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Security notice */}
        {!isProcessingOrDone && (
          <div className="flex items-start gap-2 px-3 py-2 bg-[#F0EDE8] rounded-lg">
            <Lock className="w-4 h-4 text-[#5A6B7A] mt-0.5 shrink-0" />
            <p className="text-sm text-[#5A6B7A]">
              All data is encrypted and stored securely. Photos are used only for identity
              verification and deleted after review. SSN is encrypted — we never store the full number.
            </p>
          </div>
        )}

        {/* Submit button */}
        {!isProcessingOrDone && (
          <button
            onClick={handleSubmit}
            disabled={!allComplete || isSubmitting}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-[#216982] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" /> Submit for Verification
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default ProviderIdentityVerification;
