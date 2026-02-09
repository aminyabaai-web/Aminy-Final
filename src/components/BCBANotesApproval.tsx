/**
 * BCBANotesApproval.tsx
 *
 * Complete flow for BCBA session notes:
 * 1. BCBA writes raw clinical notes after session
 * 2. AI processes and creates parent-friendly version
 * 3. Parent reviews and approves recommendations
 * 4. Approved recommendations integrate into care plan
 *
 * This creates a feedback loop where professional guidance
 * flows into the family's daily plan through AI assistance.
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { toast } from 'sonner';
import {
  FileText,
  Sparkles,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle,
  Edit3,
  Send,
  MessageSquare,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  ArrowRight,
  Lightbulb
} from 'lucide-react';

// Types
interface SessionNote {
  id: string;
  sessionId: string;
  providerId: string;
  providerName: string;
  providerTitle: string;
  childId: string;
  childName: string;
  parentName: string;
  sessionDate: string;
  sessionType: string;
  status: 'pending_review' | 'ai_processing' | 'parent_review' | 'approved' | 'rejected';
  rawNotes: string;
  aiProcessedNotes?: AIProcessedNote;
  parentResponse?: ParentResponse;
  createdAt: string;
  updatedAt: string;
}

interface AIProcessedNote {
  summary: string;
  keyTakeaways: string[];
  recommendations: Recommendation[];
  suggestedCarePlanUpdates: CarePlanUpdate[];
  encouragement: string;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: 'routine' | 'strategy' | 'goal' | 'resource';
  priority: 'high' | 'medium' | 'low';
  approved?: boolean;
}

interface CarePlanUpdate {
  id: string;
  area: string;
  currentState: string;
  proposedChange: string;
  rationale: string;
  approved?: boolean;
}

interface ParentResponse {
  approvedRecommendations: string[];
  approvedCarePlanUpdates: string[];
  feedback?: string;
  respondedAt: string;
}

// Props
interface BCBANotesApprovalProps {
  noteId?: string;
  mode: 'bcba_entry' | 'parent_review' | 'view_only';
  sessionData?: {
    sessionId: string;
    childName: string;
    parentName: string;
    sessionDate: string;
    sessionType: string;
  };
  onComplete?: (note: SessionNote) => void;
  onCancel?: () => void;
}

export function BCBANotesApproval({
  noteId,
  mode,
  sessionData,
  onComplete,
  onCancel
}: BCBANotesApprovalProps) {
  const [note, setNote] = useState<SessionNote | null>(null);
  const [rawNotes, setRawNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'recommendations']));
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set());
  const [selectedCarePlanUpdates, setSelectedCarePlanUpdates] = useState<Set<string>>(new Set());
  const [parentFeedback, setParentFeedback] = useState('');
  const [step, setStep] = useState<'write' | 'preview' | 'review' | 'complete'>('write');

  useEffect(() => {
    if (noteId) {
      loadNote(noteId);
    } else if (sessionData && mode === 'bcba_entry') {
      // Initialize new note
      setNote({
        id: `note-${Date.now()}`,
        sessionId: sessionData.sessionId,
        providerId: 'current-provider',
        providerName: 'Dr. Sarah Chen, BCBA-D',
        providerTitle: 'Clinical Director',
        childId: 'child-1',
        childName: sessionData.childName,
        parentName: sessionData.parentName,
        sessionDate: sessionData.sessionDate,
        sessionType: sessionData.sessionType,
        status: 'pending_review',
        rawNotes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setStep('write');
    }
  }, [noteId, sessionData, mode]);

  const loadNote = async (id: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock data for demo
    const mockNote: SessionNote = {
      id,
      sessionId: 'session-123',
      providerId: 'provider-1',
      providerName: 'Dr. Sarah Chen, BCBA-D',
      providerTitle: 'Clinical Director',
      childId: 'child-1',
      childName: 'Alex',
      parentName: 'Jamie',
      sessionDate: new Date().toISOString(),
      sessionType: 'BCBA Consultation',
      status: mode === 'parent_review' ? 'parent_review' : 'approved',
      rawNotes: 'Session focused on morning routine independence and transition strategies...',
      aiProcessedNotes: generateMockAIProcessedNotes(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setNote(mockNote);

    if (mode === 'parent_review') {
      setStep('review');
      // Pre-select all recommendations by default
      if (mockNote.aiProcessedNotes) {
        setSelectedRecommendations(new Set(mockNote.aiProcessedNotes.recommendations.map(r => r.id)));
        setSelectedCarePlanUpdates(new Set(mockNote.aiProcessedNotes.suggestedCarePlanUpdates.map(u => u.id)));
      }
    } else {
      setStep('complete');
    }
  };

  const generateMockAIProcessedNotes = (): AIProcessedNote => ({
    summary: `Great session today! We reviewed Alex's progress with morning routines and discussed strategies for smoother transitions. Alex has made excellent progress on getting dressed independently (now 80% success rate, up from 40% last month). We identified a few areas where small tweaks could help even more.`,

    keyTakeaways: [
      'Morning routine independence has improved significantly',
      'Visual timer is working well for task transitions',
      'Evening routine needs more structure - too many steps currently',
      'Alex responds well to "first-then" language',
      'Consider starting homework earlier to avoid bedtime conflicts'
    ],

    recommendations: [
      {
        id: 'rec-1',
        title: 'Simplify Evening Routine',
        description: 'Break the evening routine into smaller chunks with built-in breaks. Current routine has 12 steps - try reducing to 6-8 with clear visual support.',
        category: 'routine',
        priority: 'high'
      },
      {
        id: 'rec-2',
        title: 'Start Homework Earlier',
        description: 'Move homework time 30 minutes earlier to allow buffer before bedtime. This reduces stress and gives Alex transition time.',
        category: 'routine',
        priority: 'medium'
      },
      {
        id: 'rec-3',
        title: 'Add Transition Warnings',
        description: 'Use 5-minute and 2-minute warnings before activity changes. Pair with visual timer for best results.',
        category: 'strategy',
        priority: 'high'
      },
      {
        id: 'rec-4',
        title: 'Consider Weighted Blanket',
        description: 'For bedtime, a weighted blanket may help with sensory regulation and faster sleep onset. Start with 10% of body weight.',
        category: 'resource',
        priority: 'low'
      }
    ],

    suggestedCarePlanUpdates: [
      {
        id: 'update-1',
        area: 'Morning Routine',
        currentState: 'Goal: 50% independence with dressing',
        proposedChange: 'Update goal to 90% independence with dressing',
        rationale: 'Alex has exceeded the current goal (now at 80%). Time to raise the bar!'
      },
      {
        id: 'update-2',
        area: 'Evening Routine',
        currentState: 'Not currently in care plan',
        proposedChange: 'Add evening routine goal with 6-step visual schedule',
        rationale: 'This area needs focused attention. Creating structure will help.'
      },
      {
        id: 'update-3',
        area: 'Transitions',
        currentState: 'Goal: Respond to first request 30% of time',
        proposedChange: 'Goal: Respond to first request with 2-min warning 60% of time',
        rationale: 'Adding warning system should significantly improve compliance.'
      }
    ],

    encouragement: `Jamie, you're doing amazing work! The consistency you've shown with the morning routine is clearly paying off. Alex's progress is a direct result of your dedication. Remember - some days will be harder than others, and that's completely normal. You've got this!`
  });

  const processNotesWithAI = async () => {
    if (!rawNotes.trim()) {
      toast.error('Please enter session notes');
      return;
    }

    setIsProcessing(true);

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const processedNotes = generateMockAIProcessedNotes();

    setNote(prev => prev ? {
      ...prev,
      rawNotes,
      aiProcessedNotes: processedNotes,
      status: 'parent_review',
      updatedAt: new Date().toISOString()
    } : null);

    setStep('preview');
    setIsProcessing(false);

    toast.success('Notes processed successfully', {
      description: 'Review the AI summary before sending to parent'
    });
  };

  const sendToParent = () => {
    toast.success('Notes sent to parent', {
      description: `${note?.parentName} will receive a notification to review`
    });
    setStep('complete');
  };

  const handleParentApproval = () => {
    if (!note?.aiProcessedNotes) return;

    const response: ParentResponse = {
      approvedRecommendations: Array.from(selectedRecommendations),
      approvedCarePlanUpdates: Array.from(selectedCarePlanUpdates),
      feedback: parentFeedback || undefined,
      respondedAt: new Date().toISOString()
    };

    setNote(prev => prev ? {
      ...prev,
      parentResponse: response,
      status: 'approved',
      updatedAt: new Date().toISOString()
    } : null);

    setStep('complete');

    toast.success('Response submitted!', {
      description: 'Your care plan has been updated with the approved recommendations.'
    });

    if (onComplete && note) {
      onComplete({
        ...note,
        parentResponse: response,
        status: 'approved'
      });
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleRecommendation = (id: string) => {
    const newSelected = new Set(selectedRecommendations);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecommendations(newSelected);
  };

  const toggleCarePlanUpdate = (id: string) => {
    const newSelected = new Set(selectedCarePlanUpdates);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCarePlanUpdates(newSelected);
  };

  // BCBA Note Entry View
  if (mode === 'bcba_entry' && step === 'write') {
    return (
      <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4 sm:space-y-6">
        <Card className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-teal-100 rounded-xl">
              <FileText className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Session Notes</h2>
              <p className="text-sm text-gray-600">
                {note?.childName} • {note?.sessionType} • {note?.sessionDate && new Date(note.sessionDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="bg-white/70 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-teal-700 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">AI will help you:</span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1 ml-6">
              <li>• Create a parent-friendly summary</li>
              <li>• Extract actionable recommendations</li>
              <li>• Suggest care plan updates</li>
              <li>• Add encouraging language</li>
            </ul>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 md:p-6">
          <Label className="text-base font-medium text-gray-900 mb-3 block">
            Clinical Session Notes
          </Label>
          <p className="text-sm text-gray-500 mb-4">
            Write your clinical observations, goals addressed, progress made, and recommendations.
            AI will transform these into parent-friendly language.
          </p>
          <Textarea
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            placeholder="Today's session focused on...

Key observations:
-
-

Progress on goals:
-

Recommendations for home:
-

Next session focus:
- "
            className="min-h-[300px] font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-2">
            Note: Parents will see an AI-processed version, not your raw clinical notes.
          </p>
        </Card>

        <div className="flex gap-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button
            onClick={processNotesWithAI}
            disabled={!rawNotes.trim() || isProcessing}
            className="flex-1 bg-teal-600 hover:bg-teal-700"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processing with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Process with AI
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Preview for BCBA before sending to parent
  if (mode === 'bcba_entry' && step === 'preview' && note?.aiProcessedNotes) {
    return (
      <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4 sm:space-y-6">
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Preview Parent Summary</h2>
              <p className="text-sm text-gray-600">
                Review the AI-generated summary before sending to {note.parentName}
              </p>
            </div>
          </div>
        </Card>

        {renderAIProcessedNotes(note.aiProcessedNotes, false)}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('write')} className="flex-1">
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Notes
          </Button>
          <Button
            onClick={sendToParent}
            className="flex-1 bg-teal-600 hover:bg-teal-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Send to {note.parentName}
          </Button>
        </div>
      </div>
    );
  }

  // Parent Review View
  if (mode === 'parent_review' && step === 'review' && note?.aiProcessedNotes) {
    return (
      <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4 sm:space-y-6">
        <Card className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-violet-100 rounded-xl">
              <MessageSquare className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Session Summary from {note.providerName}
              </h2>
              <p className="text-sm text-gray-600">
                {note.childName}'s {note.sessionType} • {new Date(note.sessionDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="bg-white/70 rounded-lg p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              {note.aiProcessedNotes.summary}
            </p>
          </div>
        </Card>

        {/* Key Takeaways */}
        <Card className="p-3 sm:p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Key Takeaways
          </h3>
          <ul className="space-y-2">
            {note.aiProcessedNotes.keyTakeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                {takeaway}
              </li>
            ))}
          </ul>
        </Card>

        {/* Recommendations to Approve */}
        <Card className="p-3 sm:p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-teal-600" />
            Recommended Actions
            <Badge className="bg-teal-100 text-teal-700 text-xs">
              Select what to add to your plan
            </Badge>
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Check the recommendations you'd like to incorporate into {note.childName}'s care plan.
          </p>
          <div className="space-y-3">
            {note.aiProcessedNotes.recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedRecommendations.has(rec.id)
                    ? 'border-teal-300 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleRecommendation(rec.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedRecommendations.has(rec.id)}
                    onCheckedChange={() => toggleRecommendation(rec.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{rec.title}</span>
                      <Badge
                        className={`text-xs ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                          rec.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{rec.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Care Plan Updates */}
        <Card className="p-3 sm:p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-600" />
            Care Plan Updates
            <Badge className="bg-violet-100 text-violet-700 text-xs">
              Approve changes
            </Badge>
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            These updates will be reflected in {note.childName}'s personalized care plan.
          </p>
          <div className="space-y-3">
            {note.aiProcessedNotes.suggestedCarePlanUpdates.map((update) => (
              <div
                key={update.id}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedCarePlanUpdates.has(update.id)
                    ? 'border-violet-300 bg-violet-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleCarePlanUpdate(update.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedCarePlanUpdates.has(update.id)}
                    onCheckedChange={() => toggleCarePlanUpdate(update.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 block mb-2">{update.area}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="p-2 bg-gray-100 rounded">
                        <span className="text-xs text-gray-500 block">Current</span>
                        <span className="text-gray-700">{update.currentState}</span>
                      </div>
                      <div className="p-2 bg-green-100 rounded">
                        <span className="text-xs text-green-600 block">Proposed</span>
                        <span className="text-green-700">{update.proposedChange}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 italic">{update.rationale}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Encouragement */}
        <Card className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <ThumbsUp className="w-4 h-4 text-pink-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">A Note from {note.providerName.split(',')[0]}</h3>
              <p className="text-sm text-gray-700 leading-relaxed italic">
                "{note.aiProcessedNotes.encouragement}"
              </p>
            </div>
          </div>
        </Card>

        {/* Optional Feedback */}
        <Card className="p-3 sm:p-4">
          <Label className="text-sm font-medium text-gray-900 mb-2 block">
            Any feedback or questions? (Optional)
          </Label>
          <Textarea
            value={parentFeedback}
            onChange={(e) => setParentFeedback(e.target.value)}
            placeholder="Let your provider know if you have questions or concerns..."
            className="min-h-[80px]"
          />
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedRecommendations(new Set());
              setSelectedCarePlanUpdates(new Set());
            }}
            className="flex-1"
          >
            Clear All
          </Button>
          <Button
            onClick={handleParentApproval}
            className="flex-1 bg-violet-600 hover:bg-violet-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve & Update Care Plan
            <span className="ml-2 text-xs opacity-75">
              ({selectedRecommendations.size + selectedCarePlanUpdates.size} items)
            </span>
          </Button>
        </div>
      </div>
    );
  }

  // Completion View
  if (step === 'complete') {
    return (
      <div className="max-w-lg mx-auto">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            {mode === 'bcba_entry' ? 'Notes Sent Successfully!' : 'Care Plan Updated!'}
          </h2>
          <p className="text-gray-600 mb-4 sm:mb-6">
            {mode === 'bcba_entry'
              ? `${note?.parentName} will receive a notification to review your session notes.`
              : `Your selections have been added to ${note?.childName}'s care plan. The AI assistant now knows about these updates!`
            }
          </p>

          {note?.parentResponse && (
            <div className="text-left p-4 bg-gray-50 rounded-lg mb-4 sm:mb-6">
              <h4 className="font-medium text-gray-900 mb-2">What was approved:</h4>
              <p className="text-sm text-gray-600">
                {note.parentResponse.approvedRecommendations.length} recommendations,{' '}
                {note.parentResponse.approvedCarePlanUpdates.length} care plan updates
              </p>
            </div>
          )}

          <Button
            onClick={() => onComplete?.(note!)}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {mode === 'bcba_entry' ? 'Back to Dashboard' : 'View Updated Care Plan'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      </div>
    );
  }

  // Helper to render AI processed notes (used in preview and view-only)
  function renderAIProcessedNotes(notes: AIProcessedNote, interactive: boolean) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <Card className="p-3 sm:p-4">
          <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{notes.summary}</p>
        </Card>

        <Card className="p-3 sm:p-4">
          <h3 className="font-medium text-gray-900 mb-3">Key Takeaways</h3>
          <ul className="space-y-2">
            {notes.keyTakeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                {takeaway}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-3 sm:p-4">
          <h3 className="font-medium text-gray-900 mb-3">Recommendations</h3>
          <div className="space-y-3">
            {notes.recommendations.map((rec) => (
              <div key={rec.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{rec.title}</span>
                  <Badge className="text-xs">{rec.priority}</Badge>
                </div>
                <p className="text-sm text-gray-600">{rec.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-3 sm:p-4">
          <h3 className="font-medium text-gray-900 mb-3">Care Plan Updates</h3>
          <div className="space-y-3">
            {notes.suggestedCarePlanUpdates.map((update) => (
              <div key={update.id} className="p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900 block mb-2">{update.area}</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-white rounded border">
                    <span className="text-xs text-gray-500">Current:</span>
                    <span className="block">{update.currentState}</span>
                  </div>
                  <div className="p-2 bg-green-50 rounded border border-green-200">
                    <span className="text-xs text-green-600">Proposed:</span>
                    <span className="block text-green-700">{update.proposedChange}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 bg-pink-50 border-pink-200">
          <p className="text-sm text-gray-700 italic">"{notes.encouragement}"</p>
        </Card>
      </div>
    );
  }

  return null;
}

/**
 * Compact card for showing pending notes in dashboard
 */
export function PendingNotesCard({
  notes,
  onReview
}: {
  notes: Array<{ id: string; providerName: string; sessionDate: string; childName: string }>;
  onReview: (noteId: string) => void;
}) {
  if (notes.length === 0) return null;

  return (
    <Card className="p-4 border-violet-200 bg-violet-50/50">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-violet-100 rounded-lg">
          <MessageSquare className="w-4 h-4 text-violet-600" />
        </div>
        <h3 className="font-medium text-gray-900">Session Notes to Review</h3>
        <Badge className="bg-violet-100 text-violet-700">{notes.length}</Badge>
      </div>
      <div className="space-y-2">
        {notes.map((note) => (
          <button
            key={note.id}
            onClick={() => onReview(note.id)}
            className="w-full p-3 bg-white rounded-lg border border-violet-200 hover:border-violet-300 transition-all text-left flex items-center justify-between group"
          >
            <div>
              <p className="font-medium text-gray-900">{note.providerName}</p>
              <p className="text-sm text-gray-500">
                {note.childName} • {new Date(note.sessionDate).toLocaleDateString()}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-violet-600 transition-colors" />
          </button>
        ))}
      </div>
    </Card>
  );
}
