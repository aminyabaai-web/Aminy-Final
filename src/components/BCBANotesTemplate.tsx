// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Sparkles, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuditedAction } from '../hooks/useAuditedAction';

interface BCBANotes {
  childName: string;
  goal: string;
  promptingLevel: string;
  masteryCriteria: string;
  trials: string;
  abcEvents: string;
  dosage: string;
  quickTapStatus: string | null;
  reasons: string[];
  timestamp: string;
}

interface BCBANotesTemplateProps {
  childName: string;
  onSave: (notes: BCBANotes) => void;
}

export function BCBANotesTemplate({ childName, onSave }: BCBANotesTemplateProps) {
  useAuditedAction('session_notes');
  const [goal, setGoal] = useState('');
  const [promptingLevel, setPromptingLevel] = useState('');
  const [masteryCriteria, setMasteryCriteria] = useState('');
  const [trials, setTrials] = useState('');
  const [abcEvents, setAbcEvents] = useState('');
  const [dosage, setDosage] = useState('');
  const [selectedQuickTap, setSelectedQuickTap] = useState<string | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [showAiSuggestion, setShowAiSuggestion] = useState(true);

  const quickTaps = [
    { id: 'as-written', label: 'As written', color: 'bg-green-100 text-green-700 border-green-300' },
    { id: 'modified', label: 'Modified', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { id: 'couldnt-do', label: "Couldn't do", color: 'bg-amber-100 text-amber-700 border-amber-300' }
  ];

  const reasonChips = [
    'Fatigue',
    'Environment',
    'Too hard',
    'Meltdown',
    'Scheduling'
  ];

  const handleQuickTap = (tapId: string) => {
    setSelectedQuickTap(tapId);
    toast.success(`Status updated: ${quickTaps.find(t => t.id === tapId)?.label}`);
  };

  const toggleReason = (reason: string) => {
    setSelectedReasons(prev =>
      prev.includes(reason)
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  };

  const handleApplyToP = () => {
    toast.success('AI suggestion applied to Plan');
    setShowAiSuggestion(false);
  };

  const handleSave = () => {
    const notes = {
      childName,
      goal,
      promptingLevel,
      masteryCriteria,
      trials,
      abcEvents,
      dosage,
      quickTapStatus: selectedQuickTap,
      reasons: selectedReasons,
      timestamp: new Date().toISOString()
    };
    
    onSave(notes);
    toast.success('Notes saved to Vault with timestamp');
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-semibold text-[#132F43]">BCBA/RBT Session Notes</h3>
        <Badge variant="outline" className="text-sm">
          Auto-saved to Vault
        </Badge>
      </div>

      {/* Client Info */}
      <Card className="p-4 bg-[#FAF7F2] border-[#E8E4DF]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <Label className="text-sm text-[#5A6B7A]">Client Name</Label>
            <Input value={childName} readOnly className="bg-white" />
          </div>
          <div>
            <Label className="text-sm text-[#5A6B7A]">Date & Time</Label>
            <Input type="datetime-local" className="bg-white" />
          </div>
        </div>
      </Card>

      {/* Quick Taps */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-[#132F43]">Session Status</Label>
        <div className="flex gap-2 flex-wrap">
          {quickTaps.map((tap) => (
            <Button
              key={tap.id}
              variant={selectedQuickTap === tap.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickTap(tap.id)}
              className={selectedQuickTap === tap.id ? tap.color : ''}
            >
              {selectedQuickTap === tap.id && <CheckCircle className="w-4 h-4 mr-2" />}
              {tap.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Reason Chips (shown if "Couldn't do" is selected) */}
      {selectedQuickTap === 'couldnt-do' && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-[#132F43]">Reason</Label>
          <div className="flex gap-2 flex-wrap">
            {reasonChips.map((reason) => (
              <Badge
                key={reason}
                variant={selectedReasons.includes(reason) ? 'default' : 'outline'}
                className={`cursor-pointer transition-all ${
                  selectedReasons.includes(reason)
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : 'hover:bg-[#F0EDE8]'
                }`}
                onClick={() => toggleReason(reason)}
              >
                {reason}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Session Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label htmlFor="goal" className="text-sm font-semibold text-[#132F43]">Goal</Label>
          <Textarea
            id="goal"
            rows={3}
            placeholder="Current goal being addressed..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="resize-vertical mt-2"
          />
        </div>

        <div>
          <Label htmlFor="prompting" className="text-sm font-semibold text-[#132F43]">Prompting level</Label>
          <Textarea
            id="prompting"
            rows={3}
            placeholder="Level of prompting used..."
            value={promptingLevel}
            onChange={(e) => setPromptingLevel(e.target.value)}
            className="resize-vertical mt-2"
          />
        </div>

        <div>
          <Label htmlFor="mastery" className="text-sm font-semibold text-[#132F43]">Mastery criteria</Label>
          <Textarea
            id="mastery"
            rows={3}
            placeholder="Criteria for mastery..."
            value={masteryCriteria}
            onChange={(e) => setMasteryCriteria(e.target.value)}
            className="resize-vertical mt-2"
          />
        </div>

        <div>
          <Label htmlFor="trials" className="text-sm font-semibold text-[#132F43]">Trials</Label>
          <Textarea
            id="trials"
            rows={3}
            placeholder="Number and results of trials..."
            value={trials}
            onChange={(e) => setTrials(e.target.value)}
            className="resize-vertical mt-2"
          />
        </div>
      </div>

      {/* Full Width Fields */}
      <div className="space-y-3 sm:space-y-4">
        <div>
          <Label htmlFor="abc" className="text-sm font-semibold text-[#132F43]">ABC events</Label>
          <Textarea
            id="abc"
            rows={4}
            placeholder="Antecedent-Behavior-Consequence observations..."
            value={abcEvents}
            onChange={(e) => setAbcEvents(e.target.value)}
            className="resize-vertical mt-2"
          />
        </div>

        <div>
          <Label htmlFor="dosage" className="text-sm font-semibold text-[#132F43]">Dosage</Label>
          <Textarea
            id="dosage"
            rows={2}
            placeholder="Session duration and intensity..."
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            className="resize-vertical mt-2"
          />
        </div>
      </div>

      {/* AI Suggestions */}
      {showAiSuggestion && (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-purple-900 mb-2">Apply to Plan (AI)</h4>
              <p className="text-sm text-purple-700 mb-4">
                "Suggest reducing prompts to partial physical and adding generalization in 2 settings."
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleApplyToP} className="bg-purple-600 hover:bg-purple-700">
                  Apply
                </Button>
                <Button size="sm" variant="outline">
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAiSuggestion(false)}>
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Storage Note */}
      <Card className="p-3 bg-[#EEF4F8] border-[#C8DDE8]">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Storage note:</span> Saved to Vault with timestamp; included in Provider-ready packet.
          </p>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button size="lg" onClick={handleSave} className="min-w-[200px]">
          <Save className="w-4 h-4 mr-2" />
          Save to Vault
        </Button>
      </div>
    </div>
  );
}
