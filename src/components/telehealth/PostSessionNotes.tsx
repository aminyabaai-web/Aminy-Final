// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * PostSessionNotes
 *
 * Shown to the provider after a telehealth session ends.
 * Collects structured clinical notes and persists them as a
 * VisitSummary + auto-generated ActionItems via the care-plan service.
 *
 * Sections:
 *  1. Reason for visit (pre-populated from appointment if available)
 *  2. What we discussed (free-form bullet list)
 *  3. Plan for next 7 days (becomes ActionItems)
 *  4. What to track (metrics the family should monitor)
 *  5. Follow-up recommendation (next session cadence)
 *  6. Optional: update existing care-plan goals
 */

import React, { useState, useCallback } from 'react';
import {
  FileText,
  Plus,
  X,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Save,
  Target,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react';
import { createVisitSummary, type VisitSummary } from '../../lib/care-plan';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from 'sonner';
import {
  generateSuperbillFromSession,
  saveSuperbillToSupabase,
  type SessionForSuperbill,
  type ClinicalNoteForSuperbill,
  type ProviderForSuperbill,
} from '../../lib/superbill-service';
import {
  suggestCPTCodes,
  validateNoteForCPT,
  getCPTByCode,
  type CPTCode,
} from '../../lib/cpt-codes';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PostSessionNotesProps {
  /** Appointment/session identifier */
  appointmentId: string;
  /** Current user (provider) */
  userId: string;
  /** Patient's user ID — used as the VisitSummary owner */
  patientId: string;
  /** Provider ID for the VisitSummary */
  providerId: string;
  /** Pre-populated reason from the appointment booking */
  reasonForVisit?: string;
  /** Duration of the session in seconds */
  sessionDurationSeconds?: number;
  /** Whether a recording was made */
  wasRecorded?: boolean;
  /** Called when notes are saved successfully */
  onSaved?: (summary: VisitSummary) => void;
  /** Called when user wants to skip / close without saving */
  onSkip?: () => void;
  /** Child ID (for family-based care plans) */
  childId?: string;
  /** Provider type for CPT code suggestion */
  providerType?: 'bcba' | 'rbt' | 'slp' | 'psychologist' | 'therapist' | 'dev-ped';
  /** Session type for CPT code suggestion */
  sessionType?: 'individual' | 'family' | 'group' | 'evaluation' | 'follow-up';
  /** Whether this was a telehealth session */
  isTelehealth?: boolean;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface BulletItem {
  id: string;
  text: string;
}

const FOLLOW_UP_OPTIONS = [
  'Schedule follow-up in 1 week',
  'Schedule follow-up in 2 weeks',
  'Schedule follow-up in 1 month',
  'As needed — no scheduled follow-up',
  'Refer to specialist',
  'Other',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newBulletId(): string {
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostSessionNotes({
  appointmentId,
  userId,
  patientId,
  providerId,
  reasonForVisit: initialReason = '',
  sessionDurationSeconds,
  wasRecorded,
  onSaved,
  onSkip,
  childId,
  providerType,
  sessionType = 'individual',
  isTelehealth = true,
}: PostSessionNotesProps) {
  // CPT code suggestion based on session context
  const suggestedCPTs = suggestCPTCodes({
    providerType,
    sessionType,
    duration: sessionDurationSeconds ? Math.floor(sessionDurationSeconds / 60) : undefined,
    isTelemedicine: isTelehealth,
  });
  const [selectedCPT, setSelectedCPT] = useState<string>(suggestedCPTs[0]?.code || '');
  const [cptValidation, setCptValidation] = useState<{ valid: boolean; missingFields: string[]; warnings: string[] } | null>(null);
  const [showBillingQuestions, setShowBillingQuestions] = useState(false);

  // AI billing Q&A
  const [showBillingChat, setShowBillingChat] = useState(false);
  const [billingQuestion, setBillingQuestion] = useState('');
  const [billingAnswer, setBillingAnswer] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);

  const askBillingAI = useCallback(async () => {
    if (!billingQuestion.trim() || billingLoading) return;
    setBillingLoading(true);
    setBillingAnswer('');
    try {
      const cpt = selectedCPT ? getCPTByCode(selectedCPT) : null;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: `You are a billing compliance assistant for behavioral health providers. You help with CPT code selection, modifier usage, and documentation requirements for clean claim submission. Be concise (2-3 paragraphs max). Always cite specific CPT codes and modifiers. If unsure, say so and recommend checking with a billing specialist.\n\nContext: Provider type: ${providerType || 'unknown'}. Session: ${sessionType}, ${sessionDurationSeconds ? Math.floor(sessionDurationSeconds / 60) : '?'} minutes, telehealth: ${isTelehealth}. ${cpt ? `Currently selected CPT: ${cpt.code} (${cpt.shortName}). Required fields: ${cpt.requiredFields.join(', ')}. Billing tip: ${cpt.billingTip}` : 'No CPT code selected yet.'}`
              },
              { role: 'user', content: billingQuestion.trim() }
            ],
            stream: false,
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        setBillingAnswer(data.message || data.response || data.choices?.[0]?.message?.content || 'No response received.');
      } else {
        setBillingAnswer('Could not reach billing assistant. Try again or consult your billing team.');
      }
    } catch {
      setBillingAnswer('Connection error. Please try again.');
    } finally {
      setBillingLoading(false);
    }
  }, [billingQuestion, billingLoading, selectedCPT, providerType, sessionType, sessionDurationSeconds, isTelehealth]);

  // Form state
  const [reason, setReason] = useState(initialReason);
  const [discussed, setDiscussed] = useState<BulletItem[]>([
    { id: newBulletId(), text: '' },
  ]);
  const [plan, setPlan] = useState<BulletItem[]>([
    { id: newBulletId(), text: '' },
  ]);
  const [tracking, setTracking] = useState<BulletItem[]>([
    { id: newBulletId(), text: '' },
  ]);
  const [followUp, setFollowUp] = useState<string>(FOLLOW_UP_OPTIONS[0]);
  const [customFollowUp, setCustomFollowUp] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showGoalSection, setShowGoalSection] = useState(false);

  // -----------------------------------------------------------------------
  // Bullet-list helpers (shared logic for discussed / plan / tracking)
  // -----------------------------------------------------------------------

  const addBullet = useCallback(
    (setter: React.Dispatch<React.SetStateAction<BulletItem[]>>) => {
      setter(prev => [...prev, { id: newBulletId(), text: '' }]);
    },
    [],
  );

  const updateBullet = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<BulletItem[]>>,
      id: string,
      text: string,
    ) => {
      setter(prev => prev.map(b => (b.id === id ? { ...b, text } : b)));
    },
    [],
  );

  const removeBullet = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<BulletItem[]>>,
      id: string,
    ) => {
      setter(prev => {
        // Always keep at least one empty row
        if (prev.length <= 1) return [{ id: newBulletId(), text: '' }];
        return prev.filter(b => b.id !== id);
      });
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Save handler
  // -----------------------------------------------------------------------

  // Validate note against selected CPT code before save
  const runCPTValidation = useCallback(() => {
    if (!selectedCPT) return null;
    const noteContent: Record<string, string> = {
      reason,
      targets: discussed.map(b => b.text.trim()).filter(Boolean).join('; '),
      data: tracking.map(b => b.text.trim()).filter(Boolean).join('; '),
      plan: plan.map(b => b.text.trim()).filter(Boolean).join('; '),
      trials: discussed.some(b => b.text.toLowerCase().includes('trial')) ? 'present' : '',
      subjective: reason,
      objective: discussed.map(b => b.text.trim()).filter(Boolean).join('; '),
      presenting: reason,
      intervention: discussed.map(b => b.text.trim()).filter(Boolean).join('; '),
      progress: tracking.map(b => b.text.trim()).filter(Boolean).join('; '),
      risk_assessment: discussed.some(b => b.text.toLowerCase().includes('safety') || b.text.toLowerCase().includes('risk')) ? 'present' : '',
      prompting: discussed.some(b => b.text.toLowerCase().includes('prompt')) ? 'present' : '',
      articulation: discussed.some(b => b.text.toLowerCase().includes('artic') || b.text.toLowerCase().includes('sound')) ? 'present' : '',
      language: discussed.some(b => b.text.toLowerCase().includes('language') || b.text.toLowerCase().includes('comprehension')) ? 'present' : '',
    };
    return validateNoteForCPT(selectedCPT, noteContent);
  }, [selectedCPT, reason, discussed, tracking, plan]);

  const handleSave = useCallback(async () => {
    // Run CPT validation before save
    if (selectedCPT) {
      const validation = runCPTValidation();
      setCptValidation(validation);
      if (validation && !validation.valid) {
        setShowBillingQuestions(true);
        return; // Don't save yet — show provider what's missing
      }
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const followUpText =
        followUp === 'Other' ? customFollowUp : followUp;

      const summary = await createVisitSummary(patientId, {
        appointmentId,
        providerId,
        reasonForVisit: reason || 'Telehealth session',
        whatWeDiscussed: discussed.map(b => b.text.trim()).filter(Boolean),
        planForNext7Days: plan.map(b => b.text.trim()).filter(Boolean),
        whatToTrack: tracking.map(b => b.text.trim()).filter(Boolean),
        followUpRecommendation: followUpText,
        childId,
        cptCode: selectedCPT || undefined,
      });

      onSaved?.(summary);
    } catch (err) {
      console.error('[PostSessionNotes] Save failed:', err);
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save session notes',
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    patientId,
    appointmentId,
    providerId,
    reason,
    discussed,
    plan,
    tracking,
    followUp,
    customFollowUp,
    childId,
    selectedCPT,
    runCPTValidation,
    onSaved,
  ]);

  // -----------------------------------------------------------------------
  // Bullet-list renderer
  // -----------------------------------------------------------------------

  const renderBulletList = (
    items: BulletItem[],
    setter: React.Dispatch<React.SetStateAction<BulletItem[]>>,
    placeholder: string,
  ) => (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-start gap-2">
          <span className="text-[#8A9BA8] text-sm mt-2.5 w-4 text-right flex-shrink-0">
            {idx + 1}.
          </span>
          <input
            type="text"
            value={item.text}
            onChange={e => updateBullet(setter, item.id, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 bg-[#FAF7F2] border border-[#E8E4DF] rounded-lg text-sm text-[#132F43] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
          <button
            onClick={() => removeBullet(setter, item.id)}
            className="p-2 text-[#8A9BA8] hover:text-red-500 transition-colors flex-shrink-0"
            aria-label="Remove item"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={() => addBullet(setter)}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors ml-6"
      >
        <Plus size={14} />
        Add item
      </button>
    </div>
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-start justify-center z-50 overflow-y-auto p-4 pt-8 pb-8">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E8E4DF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#EEF4F8] rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#132F43]">
                Session Notes
              </h2>
              <p className="text-sm text-[#5A6B7A]">
                Document this visit for the care plan
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="p-2 text-[#8A9BA8] hover:text-[#5A6B7A] rounded-full hover:bg-[#F0EDE8] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Session metadata strip */}
        {(sessionDurationSeconds || wasRecorded) && (
          <div className="px-5 py-3 bg-[#FAF7F2] border-b border-[#E8E4DF] flex items-center gap-4 text-sm text-[#5A6B7A]">
            {sessionDurationSeconds !== undefined && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDuration(sessionDurationSeconds)}
              </span>
            )}
            {wasRecorded && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle size={12} />
                Recorded
              </span>
            )}
          </div>
        )}

        {/* Form body */}
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Reason for visit */}
          <section>
            <label className="block text-sm font-medium text-[#3A4A57] mb-1.5">
              Reason for Visit
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g., Behavioral concerns, medication follow-up..."
              className="w-full px-3 py-2.5 bg-[#FAF7F2] border border-[#E8E4DF] rounded-lg text-sm text-[#132F43] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </section>

          {/* What we discussed */}
          <section>
            <label className="block text-sm font-medium text-[#3A4A57] mb-1.5">
              What We Discussed
            </label>
            {renderBulletList(
              discussed,
              setDiscussed,
              'Key topic or observation...',
            )}
          </section>

          {/* Plan for next 7 days */}
          <section>
            <label className="block text-sm font-medium text-[#3A4A57] mb-1.5">
              Plan for Next 7 Days
              <span className="text-sm text-[#8A9BA8] font-normal ml-1.5">
                (becomes action items)
              </span>
            </label>
            {renderBulletList(
              plan,
              setPlan,
              'Action step for the family...',
            )}
          </section>

          {/* What to track */}
          <section>
            <label className="block text-sm font-medium text-[#3A4A57] mb-1.5">
              What to Track
            </label>
            {renderBulletList(
              tracking,
              setTracking,
              'Metric or behavior to monitor...',
            )}
          </section>

          {/* Follow-up recommendation */}
          <section>
            <label className="block text-sm font-medium text-[#3A4A57] mb-1.5">
              Follow-up Recommendation
            </label>
            <select
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FAF7F2] border border-[#E8E4DF] rounded-lg text-sm text-[#132F43] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              {FOLLOW_UP_OPTIONS.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {followUp === 'Other' && (
              <input
                type="text"
                value={customFollowUp}
                onChange={e => setCustomFollowUp(e.target.value)}
                placeholder="Describe custom follow-up plan..."
                className="w-full mt-2 px-3 py-2.5 bg-[#FAF7F2] border border-[#E8E4DF] rounded-lg text-sm text-[#132F43] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            )}
          </section>

          {/* CPT Code Selection + Billing Compliance */}
          {suggestedCPTs.length > 0 && (
            <section className="bg-[#EEF4F8] rounded-xl p-4 border border-[#C8DDE8]">
              <label className="block text-sm font-semibold text-[#4A6478] mb-2">
                Recommended CPT Code
              </label>
              <p className="text-sm text-blue-600 mb-3">
                AI-selected based on provider type, session type, and duration. Choose the best fit for clean billing.
              </p>
              <div className="space-y-2">
                {suggestedCPTs.map((cpt) => {
                  const isSelected = selectedCPT === cpt.code;
                  return (
                    <button
                      key={cpt.code}
                      type="button"
                      onClick={() => { setSelectedCPT(cpt.code); setCptValidation(null); setShowBillingQuestions(false); }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? 'border-blue-400 bg-blue-100'
                          : 'border-[#C8DDE8] bg-white hover:bg-[#EEF4F8]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-blue-900">{cpt.code} — {cpt.shortName}</span>
                        {isSelected && <CheckCircle size={16} className="text-blue-600" />}
                      </div>
                      <p className="text-sm text-blue-700 mt-1">{cpt.description}</p>
                      <p className="text-sm text-blue-500 mt-1 italic">{cpt.billingTip}</p>
                    </button>
                  );
                })}
              </div>

              {/* Billing Compliance Warnings */}
              {showBillingQuestions && cptValidation && (
                <div className="mt-3 bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    Complete these for clean billing ({selectedCPT})
                  </p>
                  {cptValidation.missingFields.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-amber-700">Required documentation missing:</p>
                      <ul className="text-sm text-amber-600 mt-1 space-y-0.5">
                        {cptValidation.missingFields.map(f => (
                          <li key={f}>• Add <strong>{f.replace(/_/g, ' ')}</strong> to your notes above</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {cptValidation.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-amber-600">⚠ {w}</p>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowBillingQuestions(false)}
                    className="mt-2 text-sm text-amber-700 underline hover:no-underline"
                  >
                    I've updated my notes — re-check
                  </button>
                </div>
              )}

              {/* AI Billing Q&A */}
              <button
                type="button"
                onClick={() => setShowBillingChat(!showBillingChat)}
                className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-[#4A6478] transition-colors"
              >
                <MessageSquare size={14} />
                {showBillingChat ? 'Hide billing assistant' : 'Ask about billing & CPT codes'}
              </button>

              {showBillingChat && (
                <div className="mt-2 bg-white rounded-lg p-3 border border-[#C8DDE8]">
                  <p className="text-sm text-blue-600 mb-2">
                    Ask about CPT selection, modifiers, documentation requirements, or split billing scenarios.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={billingQuestion}
                      onChange={e => setBillingQuestion(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') askBillingAI(); }}
                      placeholder="e.g. Can I bill 97155 and 97156 same session?"
                      className="flex-1 px-3 py-2 text-sm border border-[#C8DDE8] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                    />
                    <button
                      type="button"
                      onClick={askBillingAI}
                      disabled={billingLoading || !billingQuestion.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {billingLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                  {billingAnswer && (
                    <div className="mt-2 p-2.5 bg-[#EEF4F8] rounded-lg text-sm text-[#4A6478] leading-relaxed whitespace-pre-wrap">
                      {billingAnswer}
                    </div>
                  )}
                  {/* Quick billing questions */}
                  {!billingAnswer && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[
                        'What modifier for telehealth?',
                        'Can I bill parent training + direct same day?',
                        'What documentation for this CPT?',
                        'Units vs time-based billing?',
                      ].map(q => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => { setBillingQuestion(q); }}
                          className="text-sm px-2 py-1 bg-[#EEF4F8] text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Update care-plan goals (collapsible) */}
          <section>
            <button
              onClick={() => setShowGoalSection(!showGoalSection)}
              className="flex items-center gap-2 text-sm font-medium text-[#3A4A57] hover:text-[#132F43] transition-colors"
            >
              <Target size={14} />
              Update Care-Plan Goals
              {showGoalSection ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>

            {showGoalSection && (
              <div className="mt-3 p-3 bg-[#FAF7F2] border border-[#E8E4DF] rounded-lg">
                <p className="text-sm text-[#5A6B7A]">
                  Goal updates will be available after saving these notes.
                  You can update specific goals from the Care Plan tab.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Error */}
        {saveError && (
          <div className="mx-5 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{saveError}</p>
          </div>
        )}

        {/* Footer — Sign & Submit for Billing */}
        <div className="p-5 border-t border-[#E8E4DF] space-y-3">
          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="py-3 px-4 border border-[#E8E4DF] rounded-xl font-medium text-sm text-[#3A4A57] hover:bg-[#FAF7F2] transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 px-4 border border-[#E8E4DF] rounded-xl font-medium text-sm text-[#3A4A57] hover:bg-[#FAF7F2] transition-colors flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={async () => {
                // Sign + generate superbill + save
                if (selectedCPT) {
                  const validation = runCPTValidation();
                  setCptValidation(validation);
                  if (validation && !validation.valid) {
                    setShowBillingQuestions(true);
                    return;
                  }
                }

                setIsSaving(true);
                setSaveError(null);

                try {
                  const followUpText = followUp === 'Other' ? customFollowUp : followUp;

                  // 1. Save the visit summary
                  const summary = await createVisitSummary(patientId, {
                    appointmentId,
                    providerId,
                    reasonForVisit: reason || 'Telehealth session',
                    whatWeDiscussed: discussed.map(b => b.text.trim()).filter(Boolean),
                    planForNext7Days: plan.map(b => b.text.trim()).filter(Boolean),
                    whatToTrack: tracking.map(b => b.text.trim()).filter(Boolean),
                    followUpRecommendation: followUpText,
                    childId,
                    cptCode: selectedCPT || undefined,
                  });

                  // 2. Generate superbill from session data
                  if (selectedCPT) {
                    const session: SessionForSuperbill = {
                      id: appointmentId,
                      patientId,
                      patientName: childId || patientId,
                      scheduledAt: new Date().toISOString(),
                      duration: sessionDurationSeconds ? Math.floor(sessionDurationSeconds / 60) : 50,
                      type: 'Telehealth Session',
                      status: 'completed',
                    };
                    const clinicalNote: ClinicalNoteForSuperbill = {
                      noteType: 'telehealth',
                      content: {
                        reason,
                        discussed: discussed.map(b => b.text.trim()).filter(Boolean).join('; '),
                        plan: plan.map(b => b.text.trim()).filter(Boolean).join('; '),
                        tracking: tracking.map(b => b.text.trim()).filter(Boolean).join('; '),
                      },
                      cptCode: selectedCPT,
                      patientName: childId || patientId,
                      sessionId: appointmentId,
                    };
                    const provider: ProviderForSuperbill = {
                      id: providerId,
                      name: userId,
                      credentials: '',
                      type: providerType || 'therapist',
                    };

                    const superbill = generateSuperbillFromSession(session, clinicalNote, provider);
                    const superbillId = await saveSuperbillToSupabase(superbill);

                    if (superbillId) {
                      toast.success('Signed, saved & superbill generated', {
                        description: 'Claim is ready for submission. View in Claims Dashboard.',
                      });
                    } else {
                      toast.success('Notes signed & saved', {
                        description: 'Superbill generation failed — you can retry from the provider portal.',
                      });
                    }
                  } else {
                    toast.success('Notes signed & saved');
                  }

                  onSaved?.(summary);
                } catch (err) {
                  console.error('[PostSessionNotes] Sign & submit failed:', err);
                  setSaveError(err instanceof Error ? err.message : 'Failed to save');
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                isSaving
                  ? 'bg-[#E8E4DF] text-[#8A9BA8] cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <CheckCircle size={16} />
              {isSaving ? 'Submitting...' : 'Sign & Submit for Billing'}
            </button>
          </div>
          {selectedCPT && (
            <p className="text-sm text-center text-[#5A6B7A]">
              Signing will lock notes, generate a superbill for <strong>{selectedCPT}</strong>, and queue for claim submission.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PostSessionNotes;
