// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * SessionApproval — Parent-facing session note approval screen
 *
 * Shows a plain-English summary of the session note, lets parent
 * sign digitally (drawn or typed), and sends approval back to provider.
 *
 * Screen name: 'session-approval'
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle,
  MessageCircle,
  PenLine,
  ChevronRight,
  Star,
  BookOpen,
  Home,
  ArrowLeft,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  generateParentSummary,
  parentApprovesNote,
  createMockSession,
  generateNoteDraft,
  submitForParentApproval,
  submitForProviderReview,
  type AINoteDraft,
} from '../../lib/ai-session-notes';

// ============================================================================
// Props
// ============================================================================

interface SessionApprovalProps {
  draft?: AINoteDraft;
  onApproved?: (draft: AINoteDraft) => void;
  onAskQuestion?: () => void;
  onBack?: () => void;
}

// ============================================================================
// Signature Pad
// ============================================================================

interface SignaturePadProps {
  onSign: (dataUrl: string) => void;
  onClear: () => void;
}

function SignaturePad({ onSign, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [hasSig, setHasSig] = useState(false);

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = useCallback((e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e, canvas);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.strokeStyle = '#0D1B2A';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    lastPos.current = pos;
    setHasSig(true);
  }, []);

  const endDraw = useCallback(() => {
    drawing.current = false;
    lastPos.current = null;
    if (hasSig && canvasRef.current) {
      onSign(canvasRef.current.toDataURL());
    }
  }, [hasSig, onSign]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    onClear();
  }, [onClear]);

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={320}
          height={120}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSig && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <PenLine className="w-4 h-4" />
              Draw your signature here
            </p>
          </div>
        )}
      </div>
      {hasSig && (
        <button
          onClick={clear}
          className="text-sm text-[#5A6B7A] hover:text-red-500 flex items-center gap-1 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear and redo
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SessionApproval({ draft, onApproved, onAskQuestion, onBack }: SessionApprovalProps) {
  const [step, setStep] = useState<'review' | 'sign' | 'done'>('review');
  const [signatureMode, setSignatureMode] = useState<'drawn' | 'typed'>('drawn');
  const [drawnSig, setDrawnSig] = useState<string | null>(null);
  const [typedName, setTypedName] = useState('');
  const [approvedDraft, setApprovedDraft] = useState<AINoteDraft | null>(null);

  // Build a mock draft if none provided (demo mode)
  const activeDraft = draft ?? buildMockDraft();
  const summary = generateParentSummary(activeDraft);
  const { sessionData } = activeDraft;

  const canApprove = signatureMode === 'drawn' ? !!drawnSig : typedName.trim().length > 2;

  const handleApprove = () => {
    if (!canApprove) {
      toast.error(signatureMode === 'drawn' ? 'Please draw your signature' : 'Please type your full name');
      return;
    }

    const sigData = signatureMode === 'drawn' ? (drawnSig ?? '') : typedName.trim();
    const parentName = signatureMode === 'typed' ? typedName.trim() : 'Parent';

    const updated = parentApprovesNote(activeDraft, sigData, signatureMode, parentName);
    setApprovedDraft(updated);
    setStep('done');
    onApproved?.(updated);
  };

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-[#FAF7F2] transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#5A6B7A]" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="font-semibold text-[#1B2733] text-base">Session Note Approval</h1>
          <p className="text-sm text-[#5A6B7A]">{sessionData.providerName} sent you a note to review</p>
        </div>
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-4 max-w-lg mx-auto"
          >
            {/* Provider card */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF] flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#6B9080]/10 flex items-center justify-center shrink-0">
                <span className="text-[#6B9080] font-bold text-lg">
                  {sessionData.providerName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium text-[#1B2733] text-sm">{sessionData.providerName}</p>
                <p className="text-sm text-[#5A6B7A]">
                  Session on {new Date(sessionData.dateOfService).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {sessionData.durationMinutes} min
                </p>
              </div>
              <div className="ml-auto">
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                  Needs approval
                </span>
              </div>
            </div>

            {/* What happened today */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF] space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-[#EEF4F8] flex items-center justify-center">
                  <Star className="w-4 h-4 text-blue-500" />
                </div>
                <h2 className="font-semibold text-[#1B2733]">What happened today</h2>
              </div>
              <p className="text-sm text-[#3A4A57] leading-relaxed">{summary.whatHappenedToday}</p>
            </div>

            {/* What we're working on */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF] space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                </div>
                <h2 className="font-semibold text-[#1B2733]">What we're working on</h2>
              </div>
              <div className="space-y-2">
                {sessionData.goals.map((g) => (
                  <div key={g.goalId} className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        g.percentCorrect >= g.masteryThreshold
                          ? 'bg-emerald-400'
                          : g.percentCorrect >= 60
                          ? 'bg-amber-400'
                          : 'bg-slate-300'
                      }`}
                    />
                    <p className="text-sm text-[#3A4A57] flex-1">{g.description}</p>
                    <span className={`text-sm font-medium ${
                      g.percentCorrect >= g.masteryThreshold ? 'text-emerald-600' : 'text-[#5A6B7A]'
                    }`}>
                      {g.percentCorrect >= g.masteryThreshold ? 'Mastered!' : `${g.percentCorrect}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Homework */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF] space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Home className="w-4 h-4 text-purple-500" />
                </div>
                <h2 className="font-semibold text-[#1B2733]">Your homework this week</h2>
              </div>
              <p className="text-sm text-[#3A4A57] leading-relaxed">{summary.yourHomeworkThisWeek}</p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pb-6">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep('sign')}
                className="w-full py-4 rounded-2xl font-semibold text-white text-base flex items-center justify-center gap-2 shadow-sm"
                style={{ backgroundColor: '#2A7D99' }}
              >
                <CheckCircle className="w-5 h-5" />
                Looks good — approve this note
              </motion.button>
              <button
                onClick={onAskQuestion}
                className="w-full py-3.5 rounded-2xl font-medium text-[#3A4A57] bg-white border border-[#E8E4DF] text-sm flex items-center justify-center gap-2 hover:bg-[#FAF7F2] transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-slate-400" />
                I have a question for {sessionData.providerName.split(' ')[1] || 'my provider'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'sign' && (
          <motion.div
            key="sign"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-5 max-w-lg mx-auto"
          >
            <div>
              <h2 className="text-lg font-bold text-[#1B2733]">Add your signature</h2>
              <p className="text-sm text-[#5A6B7A] mt-1">
                Your signature confirms you've reviewed this session note. This is kept on file for insurance purposes.
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-xl border border-[#E8E4DF] overflow-hidden bg-white">
              {(['drawn', 'typed'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSignatureMode(mode)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    signatureMode === mode
                      ? 'bg-slate-900 text-white'
                      : 'text-[#5A6B7A] hover:bg-[#FAF7F2]'
                  }`}
                >
                  {mode === 'drawn' ? 'Draw signature' : 'Type name'}
                </button>
              ))}
            </div>

            {signatureMode === 'drawn' ? (
              <SignaturePad
                onSign={setDrawnSig}
                onClear={() => setDrawnSig(null)}
              />
            ) : (
              <div>
                <label className="text-sm font-medium text-[#5A6B7A] mb-1.5 block">Type your full legal name</label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-3 border border-[#E8E4DF] rounded-xl text-base text-[#1B2733] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-serif italic"
                  style={{ fontFamily: 'Georgia, serif' }}
                />
              </div>
            )}

            <p className="text-sm text-slate-400 leading-relaxed">
              By signing, you acknowledge that you have reviewed the session note for {sessionData.dateOfService} and consent to its use for billing and clinical record-keeping purposes.
            </p>

            <div className="space-y-3 pb-6">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleApprove}
                disabled={!canApprove}
                className="w-full py-4 rounded-2xl font-semibold text-white text-base flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                style={{ backgroundColor: canApprove ? '#2A7D99' : '#94a3b8' }}
              >
                <CheckCircle className="w-5 h-5" />
                Approve note
              </motion.button>
              <button
                onClick={() => setStep('review')}
                className="w-full py-3 text-sm text-[#5A6B7A] hover:text-[#3A4A57] transition-colors"
              >
                Go back
              </button>
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center max-w-sm mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg"
              style={{ backgroundColor: '#2A7D99' }}
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-2xl font-bold text-[#1B2733] mb-2">Note approved!</h2>
            <p className="text-[#5A6B7A] text-sm leading-relaxed mb-8">
              {sessionData.providerName} will be notified. The note is now on file and your insurance claim will be processed.
            </p>

            <div className="w-full bg-white rounded-2xl p-4 border border-[#E8E4DF] shadow-sm text-left space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-[#3A4A57]">Session note signed and locked</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-[#3A4A57]">Provider notified of approval</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-[#3A4A57]">Superbill ready for insurance submission</span>
              </div>
            </div>

            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-[#5A6B7A] hover:text-[#3A4A57] transition-colors"
              >
                Back to dashboard
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Mock data for demo mode
// ============================================================================

function buildMockDraft(): AINoteDraft {
  const session = createMockSession();
  const draft = generateNoteDraft(session);
  return submitForParentApproval(submitForProviderReview(draft));
}

export default SessionApproval;
