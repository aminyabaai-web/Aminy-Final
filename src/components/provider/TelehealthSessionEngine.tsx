// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.

import React, { useState } from 'react';
import {
  Video, Users, UserCheck, BookOpen, Eye, ArrowLeft,
  CheckCircle2, AlertTriangle, Shield, Camera, Volume2,
  FileText, Sparkles, ChevronRight, Clock
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionConfig {
  modality: string;
  cptCodes: string[];
  clientIds: string[];
  requiresBcbaSignoff: boolean;
  payerRestricted: boolean;
  dailyRoomParticipants: string[];
  aiDocTargets: string[];
  estimatedMinutes: number;
}

interface TelehealthSessionEngineProps {
  providerId: string;
  providerType: 'bcba' | 'rbt';
  patients?: Array<{ id: string; name: string; insurancePayer: string }>;
  onSessionConfigured?: (config: SessionConfig) => void;
  onStartSession?: (config: SessionConfig) => void;
  onBack?: () => void;
}

// ─── Modality definitions ─────────────────────────────────────────────────────

interface Modality {
  id: string;
  label: string;
  cptCodes: string[];
  description: string;
  participants: string[];
  billingNote: string;
  requiresBcba: boolean;
  requiresBcbaSignoff: boolean;
  payerRestricted: boolean;
  dailyRoomParticipants: string[];
  aiDocTargets: string[];
  estimatedMinutes: number;
  icon: React.ReactNode;
  omoNote?: string;
}

const MODALITIES: Modality[] = [
  {
    id: 'bcba-direct',
    label: 'BCBA Direct',
    cptCodes: ['97155'],
    description: '1:1 BCBA with the child. Full adaptive behavior treatment protocol with direct skills instruction.',
    participants: ['BCBA', 'Child'],
    billingNote: 'Billable directly under BCBA NPI. Most payers reimburse at highest rate.',
    requiresBcba: true,
    requiresBcbaSignoff: false,
    payerRestricted: false,
    dailyRoomParticipants: ['bcba', 'child'],
    aiDocTargets: ['session_note', 'skill_acquisition_data', 'behavior_frequency'],
    estimatedMinutes: 60,
    icon: <UserCheck className="w-5 h-5" />
  },
  {
    id: 'rbt-direct',
    label: 'RBT Direct',
    cptCodes: ['97153'],
    description: 'RBT delivers session with child. BCBA supervises via telehealth — required by payer and BACB.',
    participants: ['RBT', 'Child', 'BCBA (telehealth supervision)'],
    billingNote: 'Bills under supervising BCBA NPI. RBT must be on BACB registry.',
    requiresBcba: false,
    requiresBcbaSignoff: true,
    payerRestricted: false,
    dailyRoomParticipants: ['rbt', 'child', 'bcba_observer'],
    aiDocTargets: ['session_note', 'skill_acquisition_data', 'behavior_frequency', 'supervision_note'],
    estimatedMinutes: 60,
    icon: <Video className="w-5 h-5" />
  },
  {
    id: 'parent-mediated',
    label: 'Parent-Mediated',
    cptCodes: ['97156'],
    description: 'BCBA coaches parent in real time while child is present. Targets parent-implemented strategies.',
    participants: ['BCBA', 'Parent', 'Child (present)'],
    billingNote: 'Family behavior guidance — no child participation required but child present improves outcomes.',
    requiresBcba: true,
    requiresBcbaSignoff: false,
    payerRestricted: false,
    dailyRoomParticipants: ['bcba', 'parent', 'child'],
    aiDocTargets: ['parent_training_note', 'strategy_fidelity_checklist', 'caregiver_goals'],
    estimatedMinutes: 50,
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 'parent-training-only',
    label: 'Parent Training Only',
    cptCodes: ['97156'],
    description: 'BCBA meets with parent alone. Focus on education, strategy review, and home program development.',
    participants: ['BCBA', 'Parent'],
    billingNote: 'Family guidance — child does not need to be present. Check payer for unit limits.',
    requiresBcba: true,
    requiresBcbaSignoff: false,
    payerRestricted: false,
    dailyRoomParticipants: ['bcba', 'parent'],
    aiDocTargets: ['parent_training_note', 'home_program_update', 'caregiver_goals'],
    estimatedMinutes: 45,
    icon: <BookOpen className="w-5 h-5" />
  },
  {
    id: 'rbt-parent-training',
    label: 'RBT Parent Training',
    cptCodes: ['97153'],
    description: 'RBT coaches parent through strategies. BCBA supervises. Note: many payers restrict this modality.',
    participants: ['RBT', 'Parent', 'BCBA (supervision)'],
    billingNote: 'Payer-restricted — verify authorization before scheduling. Requires BCBA supervision contact.',
    requiresBcba: false,
    requiresBcbaSignoff: true,
    payerRestricted: true,
    dailyRoomParticipants: ['rbt', 'parent', 'bcba_observer'],
    aiDocTargets: ['parent_training_note', 'supervision_note', 'strategy_fidelity_checklist'],
    estimatedMinutes: 45,
    icon: <Shield className="w-5 h-5" />
  },
  {
    id: 'group-office-hours',
    label: 'Group Office Hours',
    cptCodes: ['97156'],
    description: 'BCBA hosts a live group session for up to 8 families. Topic-based parent training (sleep, mealtime, transitions, school). Cash pay only — most payers don\'t reimburse group ABA.',
    participants: ['BCBA', 'Up to 8 families'],
    billingNote: 'Cash pay $35/family, up to 8 families = up to $280/session. Each family bills as a separate 97156 unit. Verify payer policy before using insurance.',
    requiresBcba: true,
    requiresBcbaSignoff: false,
    payerRestricted: true,
    dailyRoomParticipants: ['bcba', 'family_1', 'family_2', 'family_3'],
    aiDocTargets: ['group_note', 'parent_training_note', 'attendance_log'],
    estimatedMinutes: 60,
    omoNote: 'Up to 8 families per group. BCBA earns $175–$280/hr vs $79–$129/hr for 1:1. AI generates individual session notes for each family post-session.',
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 'omo-supervision',
    label: 'OMO Supervision',
    cptCodes: ['97155', '97153'],
    description: 'One-to-many oversight. BCBA directly delivers one session while simultaneously supervising multiple RBT sessions via telehealth.',
    participants: ['BCBA', 'Child', 'Multiple RBTs', 'Multiple Clients'],
    billingNote: 'Dual billing: 97155 for BCBA direct + 97153 for each supervised RBT session. High efficiency model.',
    requiresBcba: true,
    requiresBcbaSignoff: false,
    payerRestricted: false,
    dailyRoomParticipants: ['bcba', 'child', 'rbt_1', 'rbt_2'],
    aiDocTargets: ['session_note', 'supervision_note', 'omo_log', 'skill_acquisition_data'],
    estimatedMinutes: 60,
    omoNote: 'BCBA monitors multiple RBT sessions simultaneously — one primary room + observation panels for each concurrent session.',
    icon: <Eye className="w-5 h-5" />
  }
];

// ─── Pre-session checklist ────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const PRE_SESSION_CHECKLIST: ChecklistItem[] = [
  { id: 'camera', label: 'Camera is on and well-lit', icon: <Camera className="w-4 h-4" /> },
  { id: 'quiet', label: 'Quiet space secured', icon: <Volume2 className="w-4 h-4" /> },
  { id: 'child', label: 'Child/parent ready and engaged', icon: <UserCheck className="w-4 h-4" /> },
  { id: 'docs', label: 'AI documentation draft will be auto-generated', icon: <FileText className="w-4 h-4" /> },
  { id: 'materials', label: 'Session materials prepared', icon: <CheckCircle2 className="w-4 h-4" /> }
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TelehealthSessionEngine({
  providerType,
  patients = [],
  onStartSession,
  onBack
}: TelehealthSessionEngineProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedModality, setSelectedModality] = useState<Modality | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const availableModalities = MODALITIES.filter(m =>
    providerType === 'bcba' ? true : !m.requiresBcba
  );

  const selectedClient = patients.find(p => p.id === selectedClientId);

  const buildConfig = (): SessionConfig | null => {
    if (!selectedModality) return null;
    return {
      modality: selectedModality.id,
      cptCodes: selectedModality.cptCodes,
      clientIds: selectedClientId ? [selectedClientId] : [],
      requiresBcbaSignoff: selectedModality.requiresBcbaSignoff,
      payerRestricted: selectedModality.payerRestricted,
      dailyRoomParticipants: selectedModality.dailyRoomParticipants,
      aiDocTargets: selectedModality.aiDocTargets,
      estimatedMinutes: selectedModality.estimatedMinutes
    };
  };

  const handleStartSession = () => {
    const config = buildConfig();
    if (config && onStartSession) {
      onStartSession(config);
    }
  };

  const toggleCheckItem = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = PRE_SESSION_CHECKLIST.every(item => checkedItems.has(item.id));

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={step === 1 ? onBack : () => setStep(prev => (prev - 1) as 1 | 2 | 3)}
          className="w-9 h-9 rounded-full bg-[#F0EDE8] flex items-center justify-center hover:bg-[#E8E4DF] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#5A6B7A]" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-[#1B2733]">Start Telehealth Session</h1>
          <div className="flex items-center gap-1 mt-0.5">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className={`h-1 rounded-full transition-all ${
                  n <= step ? 'bg-primary' : 'bg-[#E8E4DF]'
                } ${n === step ? 'w-6' : 'w-3'}`}
              />
            ))}
            <span className="ml-2 text-xs text-slate-400">Step {step} of 3</span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6 max-w-2xl mx-auto space-y-4">

        {/* ── Step 1: Select Modality ────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div>
              <h2 className="text-lg font-bold text-[#1B2733]">Select Session Type</h2>
              <p className="text-sm text-[#5A6B7A] mt-0.5">Choose the telehealth modality for this session.</p>
            </div>

            <div className="space-y-3">
              {availableModalities.map(modality => (
                <button
                  key={modality.id}
                  onClick={() => { setSelectedModality(modality); setStep(2); }}
                  className="w-full text-left"
                >
                  <Card className={`p-4 border-2 transition-all hover:border-[#6B9080] hover:shadow-md active:scale-[0.99] ${
                    selectedModality?.id === modality.id
                      ? 'border-[#6B9080] bg-[#6B9080]/10/50'
                      : 'border-[#E8E4DF] bg-white'
                  }`}>
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/10 to-violet-500/10 flex items-center justify-center text-[#6B9080] shrink-0">
                        {modality.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#1B2733] text-sm">{modality.label}</span>
                          {modality.cptCodes.map(code => (
                            <Badge key={code} variant="outline" className="text-xs font-mono border-[#6B9080]/20 text-[#6B9080] bg-[#6B9080]/10">
                              CPT {code}
                            </Badge>
                          ))}
                          {modality.payerRestricted && (
                            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50 gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Payer restricted
                            </Badge>
                          )}
                          {modality.requiresBcbaSignoff && (
                            <Badge variant="outline" className="text-xs border-violet-300 text-violet-700 bg-violet-50">
                              BCBA sign-off required
                            </Badge>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-[#5A6B7A] mt-1 leading-relaxed">{modality.description}</p>

                        {/* Participants */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <Users className="w-3 h-3 text-slate-400 shrink-0" />
                          {modality.participants.map((p, i) => (
                            <span key={i} className="text-xs text-[#5A6B7A]">{p}{i < modality.participants.length - 1 ? ' ·' : ''}</span>
                          ))}
                        </div>

                        {/* OMO note */}
                        {modality.omoNote && (
                          <div className="mt-2 px-3 py-2 bg-violet-50 rounded-lg border border-violet-100">
                            <p className="text-xs text-violet-700">{modality.omoNote}</p>
                          </div>
                        )}

                        {/* Billing note */}
                        <div className="mt-2 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                          <p className="text-xs text-[#5A6B7A]">{modality.billingNote}</p>
                        </div>

                        {/* AI doc targets */}
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
                          <span className="text-xs text-violet-600 font-medium">AI will capture:</span>
                          {modality.aiDocTargets.map(target => (
                            <span key={target} className="text-xs text-[#5A6B7A] bg-[#F0EDE8] rounded px-1.5 py-0.5">
                              {target.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Select Client ──────────────────────────────────────── */}
        {step === 2 && selectedModality && (
          <>
            <div>
              <h2 className="text-lg font-bold text-[#1B2733]">Select Client</h2>
              <p className="text-sm text-[#5A6B7A] mt-0.5">
                Who is this session with?
              </p>
            </div>

            {/* Selected modality summary */}
            <Card className="p-3 bg-[#6B9080]/10 border border-[#6B9080]/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[#6B9080]">
                {selectedModality.icon}
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-[#6B9080]">{selectedModality.label}</span>
                <div className="flex gap-1 mt-0.5">
                  {selectedModality.cptCodes.map(code => (
                    <span key={code} className="text-xs font-mono text-[#6B9080]">CPT {code}</span>
                  ))}
                </div>
              </div>
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xs text-[#6B9080]">{selectedModality.estimatedMinutes} min</span>
            </Card>

            <div className="space-y-2">
              {patients.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => setSelectedClientId(patient.id)}
                  className="w-full text-left"
                >
                  <Card className={`p-4 border-2 transition-all hover:border-[#6B9080] ${
                    selectedClientId === patient.id
                      ? 'border-[#6B9080] bg-[#6B9080]/10/50'
                      : 'border-[#E8E4DF] bg-white'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[#1B2733] text-sm">{patient.name}</p>
                        <p className="text-xs text-[#5A6B7A]">{patient.insurancePayer}</p>
                      </div>
                      {selectedClientId === patient.id && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </Card>
                </button>
              ))}

              {/* New Client option */}
              <button
                onClick={() => setSelectedClientId('new')}
                className="w-full text-left"
              >
                <Card className={`p-4 border-2 border-dashed transition-all hover:border-[#6B9080] ${
                  selectedClientId === 'new'
                    ? 'border-[#6B9080] bg-[#6B9080]/10/50'
                    : 'border-slate-300 bg-white'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F0EDE8] flex items-center justify-center text-slate-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[#3A4A57] text-sm">New Client</p>
                      <p className="text-xs text-slate-400">Add client details before starting</p>
                    </div>
                    {selectedClientId === 'new' && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </Card>
              </button>
            </div>

            <Button
              onClick={() => setStep(3)}
              disabled={!selectedClientId}
              className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-teal-500 to-violet-500 hover:from-teal-600 hover:to-violet-600 text-white rounded-2xl border-0 disabled:opacity-40"
            >
              Continue to Review
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </>
        )}

        {/* ── Step 3: Review + Pre-session Checklist ─────────────────────── */}
        {step === 3 && selectedModality && (
          <>
            <div>
              <h2 className="text-lg font-bold text-[#1B2733]">Ready to Start</h2>
              <p className="text-sm text-[#5A6B7A] mt-0.5">Review your session config and confirm pre-session checklist.</p>
            </div>

            {/* Session summary card */}
            <Card className="p-4 border border-[#E8E4DF] bg-white space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/10 to-violet-500/10 flex items-center justify-center text-[#6B9080]">
                  {selectedModality.icon}
                </div>
                <div>
                  <p className="font-bold text-[#1B2733]">{selectedModality.label}</p>
                  <div className="flex gap-1.5 mt-0.5">
                    {selectedModality.cptCodes.map(code => (
                      <Badge key={code} variant="outline" className="text-xs font-mono border-[#6B9080]/20 text-[#6B9080] bg-[#6B9080]/10">
                        CPT {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Client</p>
                  <p className="text-[#1B2733] font-medium mt-0.5">
                    {selectedClientId === 'new' ? 'New Client' : selectedClient?.name || '—'}
                  </p>
                  {selectedClient && <p className="text-xs text-slate-400">{selectedClient.insurancePayer}</p>}
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Duration</p>
                  <p className="text-[#1B2733] font-medium mt-0.5">{selectedModality.estimatedMinutes} min</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Participants</p>
                  <div className="mt-0.5 space-y-0.5">
                    {selectedModality.participants.map((p, i) => (
                      <p key={i} className="text-xs text-[#5A6B7A]">{p}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Flags</p>
                  <div className="mt-0.5 space-y-1">
                    {selectedModality.requiresBcbaSignoff && (
                      <Badge variant="outline" className="text-xs border-violet-300 text-violet-700 bg-violet-50 block w-fit">
                        BCBA sign-off
                      </Badge>
                    )}
                    {selectedModality.payerRestricted && (
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50 gap-1 flex w-fit items-center">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Payer restricted
                      </Badge>
                    )}
                    {!selectedModality.requiresBcbaSignoff && !selectedModality.payerRestricted && (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* AI doc targets */}
              <div className="border-t border-[#E8E4DF] pt-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  <p className="text-xs font-semibold text-violet-700">AI will auto-generate</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedModality.aiDocTargets.map(target => (
                    <span key={target} className="text-xs text-[#5A6B7A] bg-violet-50 border border-violet-100 rounded-full px-2.5 py-0.5">
                      {target.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            {/* Pre-session checklist */}
            <div>
              <h3 className="text-sm font-semibold text-[#1B2733] mb-3">Pre-Session Checklist</h3>
              <div className="space-y-2">
                {PRE_SESSION_CHECKLIST.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleCheckItem(item.id)}
                    className="w-full"
                  >
                    <Card className={`px-4 py-3 border transition-all flex items-center gap-3 ${
                      checkedItems.has(item.id)
                        ? 'border-[#6B9080]/30 bg-[#6B9080]/10'
                        : 'border-[#E8E4DF] bg-white hover:border-slate-300'
                    }`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        checkedItems.has(item.id)
                          ? 'border-[#6B9080] bg-primary'
                          : 'border-slate-300'
                      }`}>
                        {checkedItems.has(item.id) && (
                          <CheckCircle2 className="w-3 h-3 text-white fill-white" />
                        )}
                      </div>
                      <div className={`text-[#5A6B7A] shrink-0 ${checkedItems.has(item.id) ? 'text-[#6B9080]' : ''}`}>
                        {item.icon}
                      </div>
                      <span className={`text-sm text-left ${
                        checkedItems.has(item.id) ? 'text-[#6B9080] font-medium' : 'text-[#3A4A57]'
                      }`}>
                        {item.label}
                      </span>
                    </Card>
                  </button>
                ))}
              </div>
            </div>

            {/* Start button */}
            <Button
              onClick={handleStartSession}
              disabled={!allChecked}
              className="w-full h-14 text-base font-bold bg-gradient-to-r from-teal-500 to-violet-500 hover:from-teal-600 hover:to-violet-600 text-white rounded-2xl border-0 shadow-lg disabled:opacity-40 transition-all"
              style={{ boxShadow: allChecked ? '0 4px 20px rgba(67,170,139,0.35)' : 'none' }}
            >
              <Video className="w-5 h-5 mr-2" />
              Start Session
            </Button>

            {!allChecked && (
              <p className="text-center text-xs text-slate-400">
                Complete all checklist items to start
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
