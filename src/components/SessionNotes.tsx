/**
 * SessionNotes.tsx
 *
 * Professional session notes component for providers.
 * Supports SOAP format with templates for common session types.
 *
 * Features:
 * - SOAP note format (Subjective, Objective, Assessment, Plan)
 * - Pre-built templates for ABA, parent training, assessments
 * - Goal tracking integration
 * - Parent sharing controls
 * - Auto-save functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import {
  FileText,
  Save,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Clock,
  User,
  Target,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Copy,
  Sparkles
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useAuditedAction } from '../hooks/useAuditedAction';

// Types
interface SessionNote {
  id: string;
  sessionId: string;
  providerId: string;
  noteType: 'progress' | 'intake' | 'assessment' | 'discharge' | 'other';
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  goalsAddressed: string[];
  goalProgress: Record<string, 'improved' | 'maintained' | 'needs_attention'>;
  homeRecommendations?: string;
  providerFollowUp?: string;
  sharedWithParent: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  noteType: string;
  content: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

interface SessionNotesProps {
  sessionId: string;
  providerId: string;
  patientName: string;
  sessionType: string;
  sessionDate: Date;
  onClose: () => void;
  onSave?: () => void;
}

// Default templates
const DEFAULT_TEMPLATES: NoteTemplate[] = [
  {
    id: 'aba-progress',
    name: 'ABA Progress Note',
    description: 'Standard progress note for ABA therapy sessions',
    noteType: 'progress',
    content: {
      subjective: 'Parent reports: [Insert parent feedback about progress since last session, any concerns, home observations]\n\nChild presentation: [Mood, energy, engagement level at start of session]',
      objective: 'Session focus: [List specific skills/behaviors targeted]\n\nData collected:\n- Target behavior 1: [baseline/current]\n- Target behavior 2: [baseline/current]\n\nTrials completed: [#] out of [#] opportunities\nPrompt level required: [Independent/Gestural/Verbal/Physical]\n\nBehavioral observations: [Note any significant behaviors observed during session]',
      assessment: 'Progress toward goals:\n- Goal 1: [Improved/Maintained/Needs attention]\n- Goal 2: [Improved/Maintained/Needs attention]\n\nOverall session quality: [Excellent/Good/Fair/Challenging]\n\nFactors affecting performance: [Any environmental or personal factors]',
      plan: 'Next session focus:\n- [List priorities for next session]\n\nHome recommendations:\n- [List 2-3 strategies for parents to implement]\n\nFollow-up needed:\n- [Any coordination with other providers or next steps]'
    }
  },
  {
    id: 'parent-training',
    name: 'Parent Training Session',
    description: 'Template for parent coaching and training sessions',
    noteType: 'progress',
    content: {
      subjective: 'Parent concerns: [What challenges have they faced since last session?]\n\nStrategies tried: [Which recommendations did they implement?]\n\nOutcomes observed: [What results did they notice?]\n\nQuestions for today: [Topics parent wants to address]',
      objective: 'Training provided:\n- [List specific strategies taught]\n- [List skills demonstrated/practiced]\n\nParent practice:\n- [Skills parent practiced during session]\n- [Accuracy/competency observed]\n\nResources shared:\n- [Handouts, videos, apps recommended]',
      assessment: 'Parent readiness: [Ready to implement / Needs more practice / Struggling]\n\nCompetency level:\n- Strategy 1: [Emerging/Developing/Proficient]\n- Strategy 2: [Emerging/Developing/Proficient]\n\nBarriers identified: [Time, understanding, environmental, family dynamics, etc.]',
      plan: 'Homework for next session:\n1. [Specific task with measurable goal]\n2. [Specific task with measurable goal]\n\nFocus for next session: [Topic/skill]\n\nSupport needed: [Any additional resources or support]'
    }
  },
  {
    id: 'assessment',
    name: 'Assessment Session',
    description: 'Template for initial or follow-up assessments',
    noteType: 'assessment',
    content: {
      subjective: 'Referral reason: [Why assessment was requested]\n\nParent/caregiver report:\n- Developmental history: [Key milestones, concerns]\n- Current functioning: [Strengths, challenges]\n- Goals for services: [What parent hopes to achieve]',
      objective: 'Assessments administered:\n- [Assessment name]: [Score/interpretation]\n- [Assessment name]: [Score/interpretation]\n\nClinical observations:\n- Communication: [Receptive/expressive language observations]\n- Social: [Interaction style, play skills]\n- Behavior: [Compliance, attention, self-regulation]\n- Sensory: [Reactions to environment]\n- Motor: [Gross/fine motor observations]',
      assessment: 'Clinical impressions:\n[Summary of findings and clinical judgment]\n\nDiagnostic considerations:\n[Relevant diagnoses or rule-outs]\n\nStrengths identified:\n- [List key strengths]\n\nAreas of need:\n- [List priority areas for intervention]',
      plan: 'Recommendations:\n1. [Specific recommendation with rationale]\n2. [Specific recommendation with rationale]\n\nReferred to:\n- [Other providers or services]\n\nFollow-up:\n- [Timeline for next steps, report delivery]'
    }
  },
  {
    id: 'quick-note',
    name: 'Quick Progress Note',
    description: 'Abbreviated format for routine sessions',
    noteType: 'progress',
    content: {
      subjective: 'Parent update: ',
      objective: 'Session activities: \n\nData: ',
      assessment: 'Progress: ',
      plan: 'Next session: \nHome practice: '
    }
  }
];

export function SessionNotes({
  sessionId,
  providerId,
  patientName,
  sessionType,
  sessionDate,
  onClose,
  onSave
}: SessionNotesProps) {
  // HIPAA audit: log session notes view on mount (include sessionId for traceability)
  const { logAction, logExport } = useAuditedAction('session_notes', sessionId);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingNote, setExistingNote] = useState<SessionNote | null>(null);
  const [templates, setTemplates] = useState<NoteTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [shareWithParent, setShareWithParent] = useState(false);

  // Note content
  const [noteData, setNoteData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    homeRecommendations: '',
    providerFollowUp: '',
  });

  // Goal progress
  const [goalProgress, setGoalProgress] = useState<Record<string, 'improved' | 'maintained' | 'needs_attention'>>({});

  // Load existing note and templates
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Check for existing note
        const { data: noteData, error: noteError } = await supabase
          .from('session_notes')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (noteData && !noteError) {
          setExistingNote({
            id: noteData.id,
            sessionId: noteData.session_id,
            providerId: noteData.provider_id,
            noteType: noteData.note_type,
            subjective: noteData.subjective,
            objective: noteData.objective,
            assessment: noteData.assessment,
            plan: noteData.plan,
            goalsAddressed: noteData.goals_addressed || [],
            goalProgress: noteData.goal_progress || {},
            homeRecommendations: noteData.home_recommendations,
            providerFollowUp: noteData.provider_follow_up,
            sharedWithParent: noteData.shared_with_parent,
            createdAt: noteData.created_at,
            updatedAt: noteData.updated_at,
          });

          setNoteData({
            subjective: noteData.subjective || '',
            objective: noteData.objective || '',
            assessment: noteData.assessment || '',
            plan: noteData.plan || '',
            homeRecommendations: noteData.home_recommendations || '',
            providerFollowUp: noteData.provider_follow_up || '',
          });
          setShareWithParent(noteData.shared_with_parent);
          setGoalProgress(noteData.goal_progress || {});
        }

        // Load provider's custom templates
        const { data: customTemplates } = await supabase
          .from('session_note_templates')
          .select('*')
          .or(`provider_id.eq.${providerId},is_public.eq.true`);

        if (customTemplates && customTemplates.length > 0) {
          const mapped: NoteTemplate[] = customTemplates.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description || '',
            noteType: t.note_type,
            content: t.template_content,
          }));
          setTemplates([...DEFAULT_TEMPLATES, ...mapped]);
        }
      } catch (err) {
        console.error('[SessionNotes] Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [sessionId, providerId]);

  // Apply template
  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setNoteData({
        ...noteData,
        subjective: template.content.subjective,
        objective: template.content.objective,
        assessment: template.content.assessment,
        plan: template.content.plan,
      });
      setSelectedTemplate(templateId);
      setShowTemplates(false);
    }
  };

  // Save note
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const notePayload = {
        session_id: sessionId,
        provider_id: providerId,
        note_type: 'progress',
        subjective: noteData.subjective || null,
        objective: noteData.objective || null,
        assessment: noteData.assessment || null,
        plan: noteData.plan || null,
        home_recommendations: noteData.homeRecommendations || null,
        provider_follow_up: noteData.providerFollowUp || null,
        goal_progress: goalProgress,
        shared_with_parent: shareWithParent,
        updated_at: new Date().toISOString(),
      };

      if (existingNote) {
        const { error } = await supabase
          .from('session_notes')
          .update(notePayload)
          .eq('id', existingNote.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('session_notes')
          .insert(notePayload);

        if (error) throw error;
      }

      onSave?.();
      onClose();
    } catch (err) {
      console.error('[SessionNotes] Error saving note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="max-w-4xl w-full p-8">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
            <span className="text-neutral-600">Loading session notes...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 sticky top-0 bg-white z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Session Notes</h2>
              <p className="text-sm text-neutral-500 mt-1">
                <User className="w-3.5 h-3.5 inline mr-1" />
                {patientName} • {sessionType}
                <Clock className="w-3.5 h-3.5 inline ml-3 mr-1" />
                {sessionDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {existingNote && (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Saved
                </Badge>
              )}
              <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Template Selector */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <span className="text-sm font-medium text-neutral-700">Use a template:</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              {selectedTemplate
                ? templates.find(t => t.id === selectedTemplate)?.name
                : 'Select Template'
              }
              {showTemplates ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
          </div>

          {showTemplates && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template.id)}
                  className={`p-3 text-left rounded-lg border transition-colors ${
                    selectedTemplate === template.id
                      ? 'bg-teal-50 border-teal-300'
                      : 'bg-white border-neutral-200 hover:border-teal-200 hover:bg-teal-50/50'
                  }`}
                >
                  <p className="font-medium text-neutral-900 text-sm">{template.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{template.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Note Content */}
        <div className="p-6 space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Subjective */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">S</span>
              Subjective
              <span className="text-xs font-normal text-neutral-400">- Parent/caregiver report</span>
            </label>
            <Textarea
              value={noteData.subjective}
              onChange={(e) => setNoteData({ ...noteData, subjective: e.target.value })}
              placeholder="Document parent/caregiver reports, concerns, and observations since last session..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Objective */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">O</span>
              Objective
              <span className="text-xs font-normal text-neutral-400">- Clinical observations & data</span>
            </label>
            <Textarea
              value={noteData.objective}
              onChange={(e) => setNoteData({ ...noteData, objective: e.target.value })}
              placeholder="Document session activities, data collected, and behavioral observations..."
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Assessment */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">A</span>
              Assessment
              <span className="text-xs font-normal text-neutral-400">- Clinical interpretation</span>
            </label>
            <Textarea
              value={noteData.assessment}
              onChange={(e) => setNoteData({ ...noteData, assessment: e.target.value })}
              placeholder="Provide clinical assessment of progress toward goals and overall functioning..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Plan */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">P</span>
              Plan
              <span className="text-xs font-normal text-neutral-400">- Next steps & recommendations</span>
            </label>
            <Textarea
              value={noteData.plan}
              onChange={(e) => setNoteData({ ...noteData, plan: e.target.value })}
              placeholder="Outline plan for next session, home recommendations, and follow-up actions..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Home Recommendations (for parent sharing) */}
          <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
            <label className="flex items-center gap-2 text-sm font-medium text-teal-800 mb-2">
              <Target className="w-4 h-4" />
              Home Practice Recommendations
              <span className="text-xs font-normal text-teal-600">- Will be shared with parent if enabled</span>
            </label>
            <Textarea
              value={noteData.homeRecommendations}
              onChange={(e) => setNoteData({ ...noteData, homeRecommendations: e.target.value })}
              placeholder="Specific strategies and activities for home practice..."
              rows={3}
              className="resize-none bg-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-100 sticky bottom-0 bg-white">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShareWithParent(!shareWithParent)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                shareWithParent
                  ? 'bg-teal-50 border-teal-300 text-teal-700'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {shareWithParent ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Share with parent</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span className="text-sm">Private note</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Notes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default SessionNotes;
