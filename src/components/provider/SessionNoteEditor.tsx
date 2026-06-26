// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * SessionNoteEditor — Enhanced with AI draft panel, inline diff, parent approval flow
 *
 * Left panel: AI-generated SOAP draft (editable rich text)
 * Right panel: session metadata (CPT, duration, goals, data)
 * - "AI Draft" badge showing it was AI-generated
 * - Inline diff showing what provider changed vs. AI draft
 * - "Request Parent Approval" → sends notification
 * - Locked/finalized state with green checkmark
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  FileText,
  CheckCircle,
  Clock,
  Send,
  Save,
  Eye,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  GitCompare,
  X,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AISessionNote, NoteStatus, CPTSuggestion } from '../../lib/ai-note-engine';

// ============================================================================
// Types
// ============================================================================

interface SessionNoteEditorProps {
  note: AISessionNote;
  childName?: string;
  sessionDate?: string;
  onApproveAndSend?: (updatedNote: AISessionNote) => void;
  onSaveDraft?: (updatedNote: AISessionNote) => void;
  onRequestParentApproval?: (updatedNote: AISessionNote) => void;
}

// ============================================================================
// Status Config
// ============================================================================

const STATUS_CONFIG: Record<NoteStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'bg-[#EDF4F7] text-[#3A4A57]', icon: <FileText className="w-3 h-3" /> },
  provider_review: { label: 'Under Review', color: 'bg-amber-100 text-amber-800', icon: <Eye className="w-3 h-3" /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
  sent_to_parent: { label: 'Sent to Parent', color: 'bg-blue-100 text-[#4A6478]', icon: <Send className="w-3 h-3" /> },
  parent_acknowledged: { label: 'Parent Acknowledged', color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="w-3 h-3" /> },
};

// ============================================================================
// Inline diff helper
// ============================================================================

function computeDiff(original: string, edited: string): React.ReactNode {
  if (original === edited) return null;

  // Simple word-level diff: highlight removed and added words
  const origWords = original.split(/\s+/);
  const editWords = edited.split(/\s+/);

  // Show a simple before/after summary instead of complex diff
  const originalLines = original.split('\n');
  const editedLines = edited.split('\n');
  const changedLines = editedLines.filter((l, i) => l !== originalLines[i]);

  if (changedLines.length === 0 && origWords.length !== editWords.length) {
    return (
      <p className="text-sm text-[#5A6B7A]">
        {editWords.length > origWords.length
          ? `+${editWords.length - origWords.length} words added`
          : `${origWords.length - editWords.length} words removed`}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="bg-red-50 border-l-2 border-red-400 px-2 py-1 rounded-r text-sm text-red-700 line-through">
        {original.substring(0, 120)}{original.length > 120 ? '...' : ''}
      </div>
      <div className="bg-green-50 border-l-2 border-green-400 px-2 py-1 rounded-r text-sm text-green-700">
        {edited.substring(0, 120)}{edited.length > 120 ? '...' : ''}
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function SessionNoteEditor({
  note,
  childName = 'Client',
  sessionDate,
  onApproveAndSend,
  onSaveDraft,
  onRequestParentApproval,
}: SessionNoteEditorProps) {
  const [subjective, setSubjective] = useState(note.soapNote.subjective);
  const [objective, setObjective] = useState(note.soapNote.objective);
  const [assessment, setAssessment] = useState(note.soapNote.assessment);
  const [plan, setPlan] = useState(note.soapNote.plan);
  const [selectedCPTs, setSelectedCPTs] = useState<Set<string>>(
    new Set(note.cptSuggestions.filter(c => c.confidence >= 0.8).map(c => c.code))
  );
  const [status, setStatus] = useState<NoteStatus>(note.status);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [activePanel, setActivePanel] = useState<'edit' | 'meta'>('edit');

  const isLocked = status === 'sent_to_parent' || status === 'parent_acknowledged';

  // Track which fields have been changed from the AI original
  const changedFields = useMemo(() => ({
    subjective: subjective !== note.soapNote.subjective,
    objective: objective !== note.soapNote.objective,
    assessment: assessment !== note.soapNote.assessment,
    plan: plan !== note.soapNote.plan,
  }), [subjective, objective, assessment, plan, note.soapNote]);

  const editCount = Object.values(changedFields).filter(Boolean).length;

  const buildUpdatedNote = useCallback((): AISessionNote => ({
    ...note,
    soapNote: { subjective, objective, assessment, plan },
    cptSuggestions: note.cptSuggestions.map(c => ({
      ...c,
      units: selectedCPTs.has(c.code) ? c.units : 0,
    })),
    status,
  }), [note, subjective, objective, assessment, plan, selectedCPTs, status]);

  const handleSaveDraft = () => {
    const updated = buildUpdatedNote();
    updated.status = 'draft';
    setStatus('draft');
    onSaveDraft?.(updated);
    toast.success('Draft saved');
  };

  const handleApproveAndSend = () => {
    if (selectedCPTs.size === 0) {
      toast.error('Please select at least one CPT code before approving');
      return;
    }
    const updated = buildUpdatedNote();
    updated.status = 'sent_to_parent';
    setStatus('sent_to_parent');
    onApproveAndSend?.(updated);
    toast.success('Note approved and sent to parent');
  };

  const handleRequestParentApproval = () => {
    if (selectedCPTs.size === 0) {
      toast.error('Select at least one CPT code first');
      return;
    }
    const updated = buildUpdatedNote();
    updated.status = 'sent_to_parent';
    setStatus('sent_to_parent');
    onRequestParentApproval?.(updated);
    toast.success('Parent approval request sent via Aminy');
  };

  const toggleCPT = (code: string) => {
    setSelectedCPTs(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const statusCfg = STATUS_CONFIG[status];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-[#132F43]">Session Note</h2>
            <Badge className="bg-violet-100 text-violet-800 flex items-center gap-1 px-2 py-0.5">
              <Sparkles className="w-3 h-3" />
              AI Draft
            </Badge>
          </div>
          <p className="text-sm text-[#5A6B7A]">
            {childName} {sessionDate ? `— ${sessionDate}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editCount > 0 && (
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors border border-amber-200"
            >
              <GitCompare className="w-3 h-3" />
              {editCount} change{editCount !== 1 ? 's' : ''} from AI
            </button>
          )}
          {isLocked && (
            <Badge className="bg-emerald-100 text-emerald-800 flex items-center gap-1 px-3 py-1">
              <Lock className="w-3 h-3" />
              Locked
            </Badge>
          )}
          <Badge className={`${statusCfg.color} flex items-center gap-1.5 px-3 py-1`}>
            {statusCfg.icon}
            {statusCfg.label}
          </Badge>
        </div>
      </div>

      {/* Status Lifecycle */}
      <Card className="p-3 bg-[#F6FBFB]">
        <div className="flex items-center justify-between gap-1 text-sm">
          {Object.entries(STATUS_CONFIG).map(([key, cfg], idx) => {
            const isActive = key === status;
            const isPast =
              Object.keys(STATUS_CONFIG).indexOf(key) <
              Object.keys(STATUS_CONFIG).indexOf(status);
            return (
              <React.Fragment key={key}>
                {idx > 0 && (
                  <div className={`flex-1 h-0.5 ${isPast ? 'bg-green-400' : 'bg-[#E8E4DF]'}`} />
                )}
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full whitespace-nowrap ${
                    isActive
                      ? 'bg-white shadow-sm font-medium text-[#132F43]'
                      : isPast
                      ? 'text-green-700'
                      : 'text-slate-400'
                  }`}
                >
                  {isPast ? <CheckCircle className="w-3 h-3 text-green-500" /> : cfg.icon}
                  <span className="hidden sm:inline">{cfg.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* Diff View */}
      <AnimatePresence>
        {showDiff && editCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-4 border-amber-200 bg-amber-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-amber-900 flex items-center gap-2 text-sm">
                  <GitCompare className="w-4 h-4" />
                  Your edits vs. AI draft
                </h3>
                <button onClick={() => setShowDiff(false)}>
                  <X className="w-4 h-4 text-amber-600" />
                </button>
              </div>
              <div className="space-y-3">
                {changedFields.subjective && (
                  <div>
                    <p className="text-sm font-semibold text-amber-800 mb-1">Subjective</p>
                    {computeDiff(note.soapNote.subjective, subjective)}
                  </div>
                )}
                {changedFields.objective && (
                  <div>
                    <p className="text-sm font-semibold text-amber-800 mb-1">Objective</p>
                    {computeDiff(note.soapNote.objective, objective)}
                  </div>
                )}
                {changedFields.assessment && (
                  <div>
                    <p className="text-sm font-semibold text-amber-800 mb-1">Assessment</p>
                    {computeDiff(note.soapNote.assessment, assessment)}
                  </div>
                )}
                {changedFields.plan && (
                  <div>
                    <p className="text-sm font-semibold text-amber-800 mb-1">Plan</p>
                    {computeDiff(note.soapNote.plan, plan)}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel toggle (mobile) */}
      <div className="flex rounded-xl border border-[#E8E4DF] overflow-hidden bg-white md:hidden">
        {(['edit', 'meta'] as const).map((panel) => (
          <button
            key={panel}
            onClick={() => setActivePanel(panel)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activePanel === panel ? 'bg-slate-900 text-white' : 'text-[#5A6B7A]'
            }`}
          >
            {panel === 'edit' ? 'SOAP Note' : 'Session Data'}
          </button>
        ))}
      </div>

      {/* Two-column layout on desktop, tab-switched on mobile */}
      <div className="md:grid md:grid-cols-5 md:gap-4">
        {/* Left: SOAP editor */}
        <div className={`md:col-span-3 space-y-4 ${activePanel !== 'edit' ? 'hidden md:block' : ''}`}>
          <SOAPSection
            label="Subjective"
            sublabel="Child presentation, parent report, mood/affect"
            value={subjective}
            onChange={setSubjective}
            color="blue"
            disabled={isLocked}
            isEdited={changedFields.subjective}
          />
          <SOAPSection
            label="Objective"
            sublabel="CPT code, duration, goals addressed, data collected, % correct"
            value={objective}
            onChange={setObjective}
            color="emerald"
            disabled={isLocked}
            isEdited={changedFields.objective}
          />
          <SOAPSection
            label="Assessment"
            sublabel="Progress toward goals, barriers, patterns noted"
            value={assessment}
            onChange={setAssessment}
            color="amber"
            disabled={isLocked}
            isEdited={changedFields.assessment}
          />
          <SOAPSection
            label="Plan"
            sublabel="Next session focus, parent homework, program adjustments"
            value={plan}
            onChange={setPlan}
            color="purple"
            disabled={isLocked}
            isEdited={changedFields.plan}
          />
        </div>

        {/* Right: Session metadata */}
        <div className={`md:col-span-2 space-y-4 ${activePanel !== 'meta' ? 'hidden md:block' : ''}`}>
          {/* CPT Codes */}
          <Card className="p-4">
            <h3 className="font-medium text-[#132F43] mb-3 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-[#5A6B7A]" />
              CPT Code Suggestions
            </h3>
            <div className="space-y-2">
              {note.cptSuggestions.map(cpt => (
                <CPTRow
                  key={cpt.code}
                  cpt={cpt}
                  selected={selectedCPTs.has(cpt.code)}
                  onToggle={() => toggleCPT(cpt.code)}
                  disabled={isLocked}
                />
              ))}
            </div>
          </Card>

          {/* Metrics (collapsible) */}
          <Card className="p-4">
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="font-medium text-[#132F43] flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-[#5A6B7A]" />
                Session Metrics
              </h3>
              {showMetrics ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {showMetrics && (
              <div className="mt-3 space-y-3">
                <MetricBar label="Accuracy" value={note.metrics.accuracy} />
                <MetricBar label="Engagement" value={note.metrics.engagement} />
                <MetricBar label="Goal Progress" value={note.metrics.goalProgress} />
              </div>
            )}
          </Card>

          {/* Parent approval preview */}
          {!isLocked && (
            <Card className="p-4 bg-[#EEF4F8] border-[#C8DDE8]">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Parent Approval Flow</p>
                  <p className="text-sm text-blue-700 mt-0.5 leading-relaxed">
                    After you approve, the parent receives a plain-English summary to review and sign digitally. Their signature is required for insurance claims.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          onClick={handleSaveDraft}
          variant="outline"
          className="gap-2"
          disabled={isLocked}
        >
          <Save className="w-4 h-4" />
          Save Draft
        </Button>
        <Button
          onClick={handleRequestParentApproval}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLocked}
        >
          <Send className="w-4 h-4" />
          Request Parent Approval
        </Button>
        <Button
          onClick={handleApproveAndSend}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={isLocked}
        >
          <CheckCircle className="w-4 h-4" />
          Approve & Finalize
        </Button>
      </div>

      {/* Locked state indicator */}
      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200"
        >
          <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700">
            This note is locked. Parent has been notified. Superbill ready for claim submission.
          </p>
        </motion.div>
      )}

      {/* Generated timestamp */}
      <p className="text-sm text-slate-400 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        AI-generated {new Date(note.generatedAt).toLocaleString()} — review before sending
      </p>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function SOAPSection({
  label,
  sublabel,
  value,
  onChange,
  color,
  disabled,
  isEdited,
}: {
  label: string;
  sublabel: string;
  value: string;
  onChange: (v: string) => void;
  color: string;
  disabled?: boolean;
  isEdited?: boolean;
}) {
  const borderColors: Record<string, string> = {
    blue: 'border-l-blue-500',
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    purple: 'border-l-purple-500',
  };

  return (
    <Card className={`p-4 border-l-4 ${borderColors[color] || 'border-l-slate-300'}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-[#132F43] text-sm">{label}</h3>
          <p className="text-sm text-[#5A6B7A]">{sublabel}</p>
        </div>
        {isEdited && (
          <Badge className="bg-amber-100 text-amber-700 text-sm px-2 py-0.5 shrink-0">
            Edited
          </Badge>
        )}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        rows={4}
        className="w-full rounded-md border border-[#E8E4DF] bg-white px-3 py-2 text-sm text-[#132F43] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y disabled:opacity-60 disabled:cursor-not-allowed"
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
    </Card>
  );
}

function CPTRow({
  cpt,
  selected,
  onToggle,
  disabled,
}: {
  cpt: CPTSuggestion;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const confidenceColor =
    cpt.confidence >= 0.85
      ? 'text-green-700 bg-green-50'
      : cpt.confidence >= 0.7
      ? 'text-amber-700 bg-amber-50'
      : 'text-[#5A6B7A] bg-[#F6FBFB]';

  return (
    <label
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        selected ? 'border-blue-300 bg-[#EEF4F8]/50' : 'border-[#E8E4DF] bg-white'
      } ${disabled ? 'opacity-60 pointer-events-none' : 'hover:border-[#C8DDE8]'}`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        disabled={disabled}
        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-medium text-[#132F43]">{cpt.code}</span>
          <span className="text-sm text-[#5A6B7A] truncate">{cpt.description}</span>
        </div>
        <span className="text-sm text-[#5A6B7A]">{cpt.units} unit{cpt.units !== 1 ? 's' : ''}</span>
      </div>
      <Badge className={`text-sm ${confidenceColor}`}>
        {Math.round(cpt.confidence * 100)}%
      </Badge>
    </label>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const barColor =
    value >= 75 ? 'bg-green-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-[#3A4A57]">{label}</span>
        <span className="font-medium text-[#132F43]">{value}%</span>
      </div>
      <div className="h-2 bg-[#EDF4F7] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

export default SessionNoteEditor;
