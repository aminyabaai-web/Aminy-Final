/**
 * Parent Approval Card
 * 
 * Shows provider suggestions to parent with:
 * - Clear explanation of what changes
 * - Before/After preview
 * - Accept / Not now buttons
 * - Auto-apply on accept + celebration
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, X, Info, Undo, Sparkles, ArrowLeft, ClipboardList, Target, MessageCircle, Star, Home, FileText } from 'lucide-react';
import {
  ProviderSuggestion,
  type RoutineChangePayload,
  type GoalAdjustmentPayload,
  type PromptScriptPayload,
  type ReinforcementPayload
} from '../lib/provider-suggestion-system';
import { HAPTICS, ANIMATIONS } from '../lib/mobile-experience-enhancer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface ParentApprovalCardProps {
  suggestion: ProviderSuggestion;
  onAccept: () => void;
  onReject: () => void;
  onUndo?: () => void;
  /** When true, the card renders inside its own full-screen page wrapper (header + padding + background). Defaults to false for embedded card usage. */
  asFullScreen?: boolean;
  /** Optional back handler; a back button only renders when this is provided (typically alongside asFullScreen). */
  onBack?: () => void;
}

export function ParentApprovalCard({ suggestion, onAccept, onReject, onUndo, asFullScreen = false, onBack }: ParentApprovalCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Data-honesty guard: a suggestion with no provider and no rationale is an
  // un-hydrated placeholder (e.g. rendered before a real pending review loads).
  // Never show blank "Suggested by ____" / empty rationale to a real parent.
  const isHydrated = Boolean(
    suggestion && (suggestion.providerName?.trim() || suggestion.rationale?.trim())
  );

  const canUndo = suggestion.status === 'accepted' && suggestion.reviewedAt && 
    (Date.now() - new Date(suggestion.reviewedAt).getTime()) < (24 * 60 * 60 * 1000);

  const handleAccept = async () => {
    HAPTICS.success();
    setIsAccepting(true);
    
    // Simulate acceptance
    setTimeout(() => {
      setIsAccepting(false);
      setShowCelebration(true);
      onAccept();
      
      // Hide celebration after 3 seconds
      setTimeout(() => setShowCelebration(false), 3000);
    }, 500);
  };

  const handleReject = () => {
    HAPTICS.light();
    onReject();
  };

  const handleUndo = () => {
    HAPTICS.medium();
    if (onUndo) onUndo();
  };

  if (suggestion.status === 'rejected') {
    return null; // Don't show rejected suggestions
  }

  const typeMeta: Record<ProviderSuggestion['type'], { icon: React.ElementType; label: string }> = {
    routine_change: { icon: ClipboardList, label: 'Routine Adjustment' },
    goal_adjustment: { icon: Target, label: 'Goal Update' },
    prompt_script: { icon: MessageCircle, label: 'New Strategy' },
    reinforcement: { icon: Star, label: 'Reinforcement Plan' },
    environment_change: { icon: Home, label: 'Environment Suggestion' },
    coverage_note: { icon: FileText, label: 'Coverage Note' }
  };
  const TypeIcon = typeMeta[suggestion.type].icon;
  // One unified soft teal chip for every suggestion type (brand accent).
  const typeChipCls = 'bg-[#EDF4F7] text-[#2A7D99] border-[#C8DDE8]';

  // When rendered as a standalone screen, wrap content in a full-screen page
  // container (background + padding + centered column + optional back button)
  // so it matches the other full screens instead of floating top-left.
  const wrapScreen = (children: React.ReactNode) =>
    asFullScreen ? (
      <div className="min-h-screen bg-mist dark:bg-slate-900 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="flex items-center gap-2 text-sm text-[#5A6B7A] hover:text-[#132F43] mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <h1 className="text-xl font-bold text-[#132F43]">Suggested for you</h1>
          <p className="text-sm text-[#5A6B7A] mt-0.5 mb-4">
            Ideas from your care team — you decide what to apply.
          </p>
          {children}
        </div>
      </div>
    ) : (
      <>{children}</>
    );

  // Honest empty/loading state when no real suggestion has been provided.
  if (!isHydrated) {
    return wrapScreen(
      <motion.div {...ANIMATIONS.fadeIn}>
        <Card className="p-6 border-2 border-[#E8E4DF] bg-white text-center">
          <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <h4 className="text-sm font-medium text-[#132F43] mb-1">No suggestions to review</h4>
          <p className="text-sm text-[#5A6B7A]">
            When your care team shares a suggestion for you to review, it will appear here.
          </p>
        </Card>
      </motion.div>
    );
  }

  return wrapScreen(
    <>
      <motion.div {...ANIMATIONS.fadeIn}>
        <Card className={`p-4 border-2 ${
          suggestion.status === 'accepted'
            ? 'bg-green-50 border-green-200'
            : 'bg-[#EEF4F8] border-[#C8DDE8]'
        }`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={typeChipCls}>
                  <TypeIcon className="w-3 h-3 mr-1" />
                  {typeMeta[suggestion.type].label}
                </Badge>
                {suggestion.status === 'accepted' && (
                  <Badge className="bg-green-600 text-white">
                    <Check className="w-3 h-3 mr-1" />
                    Accepted
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[#132F43]">
                Suggested by <strong>{suggestion.providerName}</strong>
                {suggestion.providerRole &&
                  !suggestion.providerName?.toLowerCase().includes(suggestion.providerRole.toLowerCase()) && (
                    <span className="text-[#5A6B7A] ml-1">({suggestion.providerRole})</span>
                  )}
              </p>
              <p className="text-sm text-[#5A6B7A] mt-1">
                {new Date(suggestion.createdAt).toLocaleDateString()}
              </p>
            </div>
            
            <button
              onClick={() => setShowDetails(true)}
              aria-label="View suggestion details"
              className="text-[#2A7D99] hover:text-[#1F6080]"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>

          {/* Summary */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-[#132F43] mb-2">
              {getSuggestionTitle(suggestion)}
            </h4>
            <p className="text-sm text-[#3A4A57] mb-2">
              {suggestion.rationale}
            </p>
            <div className="bg-white rounded-lg p-3 border border-[#E8E4DF]">
              <p className="text-sm text-[#5A6B7A] mb-1">Expected outcome:</p>
              <p className="text-sm text-[#132F43]">{suggestion.expectedOutcome}</p>
            </div>
          </div>

          {/* Before/After Preview */}
          <SuggestionPreview suggestion={suggestion} />

          {/* Actions */}
          {suggestion.status === 'proposed' && (
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleAccept}
                disabled={isAccepting}
                className="flex-1 bg-[#2A7D99] hover:bg-[#376E80] text-white"
              >
                {isAccepting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                    </motion.div>
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Accept & Apply
                  </>
                )}
              </Button>
              <Button
                onClick={handleReject}
                variant="outline"
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Not Now
              </Button>
            </div>
          )}

          {/* Undo Option */}
          {canUndo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 text-center"
            >
              <button
                onClick={handleUndo}
                className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1 mx-auto"
              >
                <Undo className="w-3 h-3" />
                Undo this change (available for 24 hours)
              </button>
            </motion.div>
          )}

          {/* Celebration Message */}
          <AnimatePresence>
            {showCelebration && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg"
              >
                <p className="text-sm text-green-900 text-center">
                  🎉 Applied! You're not doing this alone. {suggestion.providerName} is supporting you every step.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suggestion Details</DialogTitle>
          </DialogHeader>
          <SuggestionDetailsView suggestion={suggestion} />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===================================
// SUGGESTION PREVIEW
// ===================================

function SuggestionPreview({ suggestion }: { suggestion: ProviderSuggestion }) {
  switch (suggestion.type) {
    case 'routine_change':
      return <RoutineChangePreview payload={suggestion.payload as unknown as RoutineChangePayload} />;
    case 'goal_adjustment':
      return <GoalAdjustmentPreview payload={suggestion.payload as unknown as GoalAdjustmentPayload} />;
    case 'prompt_script':
      return <PromptScriptPreview payload={suggestion.payload as unknown as PromptScriptPayload} />;
    case 'reinforcement':
      return <ReinforcementPreview payload={suggestion.payload as unknown as ReinforcementPayload} />;
    default:
      return null;
  }
}

function RoutineChangePreview({ payload }: { payload: RoutineChangePayload }) {
  const changes = payload?.changes ?? [];
  if (changes.length === 0) return null;
  return (
    <div className="space-y-2">
      {changes.map((change, idx) => (
        <div key={`${change.field}-${idx}`} className="bg-white rounded p-2 border border-[#E8E4DF] text-sm">
          <div className="text-[#5A6B7A] mb-1 capitalize">{change.field.replace('_', ' ')}:</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[#5A6B7A] mb-1">Before:</div>
              <div className="text-[#3A4A57] line-through">{change.before}</div>
            </div>
            <div>
              <div className="text-green-600 mb-1">After:</div>
              <div className="text-[#132F43] font-medium">{change.after}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GoalAdjustmentPreview({ payload }: { payload: GoalAdjustmentPayload }) {
  return (
    <div className="bg-white rounded p-3 border border-[#E8E4DF] text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[#5A6B7A] mb-1 text-sm">Current:</div>
          <div className="text-[#3A4A57] line-through">{payload.before}</div>
        </div>
        <div>
          <div className="text-green-600 mb-1 text-sm">New:</div>
          <div className="text-[#132F43] font-medium">{payload.after}</div>
        </div>
      </div>
    </div>
  );
}

function PromptScriptPreview({ payload }: { payload: PromptScriptPayload }) {
  return (
    <div className="bg-white rounded p-3 border border-[#E8E4DF] text-sm">
      <div className="mb-2">
        <span className="text-[#5A6B7A]">For: </span>
        <span className="text-[#132F43] font-medium">{payload.situation}</span>
      </div>
      <div className="bg-[#EEF4F8] rounded p-2 text-sm text-[#3A4A57]">
        "{payload.script ?? ''}"
      </div>
      {payload.whenToUse && (
        <div className="mt-2 text-sm text-[#5A6B7A]">
          Use when: {payload.whenToUse}
        </div>
      )}
    </div>
  );
}

function ReinforcementPreview({ payload }: { payload: ReinforcementPayload }) {
  return (
    <div className="bg-white rounded p-3 border border-[#E8E4DF] text-sm">
      <div className="mb-2">
        <span className="text-[#5A6B7A]">Reinforce: </span>
        <span className="text-[#132F43] font-medium">{payload.behavior}</span>
      </div>
      <div className="mb-2">
        <span className="text-[#5A6B7A]">With: </span>
        <span className="text-green-600 font-medium">{payload.reinforcer}</span>
      </div>
      <div className="text-sm text-[#5A6B7A]">
        Schedule: {(payload.schedule ?? '').replace('_', ' ')}
      </div>
    </div>
  );
}

// ===================================
// DETAILED VIEW
// ===================================

function SuggestionDetailsView({ suggestion }: { suggestion: ProviderSuggestion }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-[#132F43] mb-2">Rationale</h4>
        <p className="text-sm text-[#3A4A57]">{suggestion.rationale}</p>
      </div>

      <div>
        <h4 className="text-sm font-medium text-[#132F43] mb-2">Expected Outcome</h4>
        <p className="text-sm text-[#3A4A57]">{suggestion.expectedOutcome}</p>
      </div>

      <div>
        <h4 className="text-sm font-medium text-[#132F43] mb-2">Changes</h4>
        <SuggestionPreview suggestion={suggestion} />
      </div>

      <div className="bg-[#FDF9F0] border border-[#EDF4F7] rounded-lg p-3">
        <p className="text-sm text-yellow-900">
          <strong>Remember:</strong> You're always the final decision-maker. Accept this suggestion only if it feels right for {suggestion.childName ?? 'your child'}. You can undo within 24 hours if needed.
        </p>
      </div>
    </div>
  );
}

// ===================================
// HELPERS
// ===================================

function getSuggestionTitle(suggestion: ProviderSuggestion): string {
  switch (suggestion.type) {
    case 'routine_change': {
      const routinePayload = suggestion.payload as unknown as RoutineChangePayload;
      const routineName = routinePayload?.routineName?.trim();
      if (!routineName) return 'Routine adjustment';
      // Avoid 'Adjust "Morning Routine" routine' when the name already ends with "routine"
      return /routine$/i.test(routineName)
        ? `Adjust "${routineName}"`
        : `Adjust "${routineName}" routine`;
    }
    case 'goal_adjustment': {
      const goalPayload = suggestion.payload as unknown as GoalAdjustmentPayload;
      return goalPayload?.goalName ? `Update goal: ${goalPayload.goalName}` : 'Goal update';
    }
    case 'prompt_script': {
      const promptPayload = suggestion.payload as unknown as PromptScriptPayload;
      return promptPayload?.situation ? `New prompting strategy for ${promptPayload.situation}` : 'New prompting strategy';
    }
    case 'reinforcement': {
      const reinforcementPayload = suggestion.payload as unknown as ReinforcementPayload;
      return reinforcementPayload?.behavior ? `Reinforce ${reinforcementPayload.behavior}` : 'Reinforcement plan';
    }
    case 'environment_change':
      return 'Environment modification suggestion';
    case 'coverage_note':
      return 'Coverage documentation note';
    default:
      return 'Provider suggestion';
  }
}
