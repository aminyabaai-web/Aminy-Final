// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Letter Drafting Flow Component
 * Interactive wizard for drafting insurance-related letters with AI assistance
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  FileText,
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  Download,
  Mail,
  Edit,
  Sparkles,
  AlertTriangle,
  Clipboard,
  Clock,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  generateLetterDraft,
  getLetterTypes,
  LetterType,
  LetterContext,
  DraftedLetter
} from '../lib/letter-drafting';

interface LetterDraftingFlowProps {
  onBack?: () => void;
  onComplete?: (letter: DraftedLetter) => void;
  userData: {
    parentName: string;
    childName: string;
    state?: string;
  };
  initialType?: LetterType;
}

type Step = 'select-type' | 'gather-info' | 'generating' | 'review' | 'complete';

export function LetterDraftingFlow({
  onBack,
  onComplete,
  userData,
  initialType
}: LetterDraftingFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>(initialType ? 'gather-info' : 'select-type');
  const [selectedType, setSelectedType] = useState<LetterType | null>(initialType || null);
  const [formData, setFormData] = useState<Partial<LetterContext>>({
    parentName: userData.parentName,
    childName: userData.childName,
    state: userData.state || ''
  });
  const [generatedLetter, setGeneratedLetter] = useState<DraftedLetter | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedBody, setEditedBody] = useState('');

  const letterTypes = getLetterTypes();

  const handleSelectType = (type: LetterType) => {
    setSelectedType(type);
    setCurrentStep('gather-info');
  };

  const updateFormData = (field: keyof LetterContext, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!selectedType) return;

    setIsGenerating(true);
    setCurrentStep('generating');

    try {
      const context: LetterContext = {
        letterType: selectedType,
        childName: formData.childName || userData.childName,
        parentName: formData.parentName || userData.parentName,
        childAge: formData.childAge,
        diagnosis: formData.diagnosis,
        diagnosisDate: formData.diagnosisDate,
        insuranceCompany: formData.insuranceCompany,
        memberId: formData.memberId,
        groupNumber: formData.groupNumber,
        state: formData.state,
        providerName: formData.providerName,
        providerCredentials: formData.providerCredentials,
        denialDate: formData.denialDate,
        denialReason: formData.denialReason,
        requestedServices: formData.requestedServices,
        hoursRequested: formData.hoursRequested,
        additionalContext: formData.additionalContext
      };

      const letter = await generateLetterDraft(context);
      setGeneratedLetter(letter);
      setEditedBody(letter.body);
      setCurrentStep('review');
    } catch (error) {
      console.error('Error generating letter:', error);
      toast.error('Failed to generate letter. Please try again.');
      setCurrentStep('gather-info');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = editMode ? editedBody : (generatedLetter?.body || '');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Letter copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = editMode ? editedBody : (generatedLetter?.body || '');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedLetter?.subject || 'letter'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Letter downloaded!');
  };

  const handleComplete = () => {
    if (generatedLetter && onComplete) {
      onComplete({
        ...generatedLetter,
        body: editMode ? editedBody : generatedLetter.body
      });
    }
    setCurrentStep('complete');
  };

  const renderTypeSelection = () => (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">What type of letter do you need?</h2>
        <p className="text-sm text-slate-600">I'll help you draft a professional letter step by step</p>
      </div>

      <div className="grid gap-3">
        {letterTypes.map((lt) => (
          <Card
            key={lt.type}
            className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-accent/30"
            onClick={() => handleSelectType(lt.type)}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900">{lt.name}</h3>
                <p className="text-sm text-slate-500">{lt.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderGatherInfo = () => {
    if (!selectedType) return null;

    const typeInfo = letterTypes.find(lt => lt.type === selectedType);

    // Different fields based on letter type
    const getFields = (): { key: string; label: string; placeholder: string; required?: boolean; type?: string }[] => {
      const baseFields: { key: string; label: string; placeholder: string; required?: boolean; type?: string }[] = [
        { key: 'childName', label: "Child's Name", placeholder: 'Alex', required: true },
        { key: 'childAge', label: "Child's Age", placeholder: '6', type: 'number' },
        { key: 'diagnosis', label: 'Diagnosis', placeholder: 'Autism Spectrum Disorder' },
        { key: 'diagnosisDate', label: 'Diagnosis Date', placeholder: 'January 2024' }
      ];

      const insuranceFields = [
        { key: 'insuranceCompany', label: 'Insurance Company', placeholder: 'Blue Cross Blue Shield' },
        { key: 'memberId', label: 'Member ID', placeholder: 'ABC123456' },
        { key: 'groupNumber', label: 'Group Number', placeholder: 'GRP001' }
      ];

      const providerFields = [
        { key: 'providerName', label: 'BCBA/Provider Name', placeholder: 'Dr. Jane Smith' },
        { key: 'providerCredentials', label: 'Provider Credentials', placeholder: 'BCBA, LBA' }
      ];

      const serviceFields = [
        { key: 'requestedServices', label: 'Services Requested', placeholder: 'ABA therapy' },
        { key: 'hoursRequested', label: 'Hours Per Week', placeholder: '25', type: 'number' }
      ];

      switch (selectedType) {
        case 'prior-authorization':
          return [...baseFields, ...insuranceFields, ...providerFields, ...serviceFields];
        case 'medical-necessity':
          return [...baseFields, ...providerFields, ...serviceFields];
        case 'appeal':
          return [
            ...baseFields,
            ...insuranceFields,
            { key: 'denialDate', label: 'Denial Date', placeholder: 'February 15, 2024' },
            { key: 'denialReason', label: 'Reason for Denial', placeholder: 'Not medically necessary' },
            ...serviceFields
          ];
        case 'waiver-enrollment':
          return [...baseFields, { key: 'state', label: 'State', placeholder: 'Arizona' }];
        case 'single-case-agreement':
          return [...baseFields, ...insuranceFields, ...providerFields];
        default:
          return baseFields;
      }
    };

    const fields = getFields();

    return (
      <div className="space-y-3 sm:space-y-4 sm:space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep('select-type')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">{typeInfo?.name}</h2>
          <p className="text-sm text-slate-600">Fill in the details below. Leave blank anything you don't know — I'll add placeholders.</p>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <Input
                type={field.type || 'text'}
                placeholder={field.placeholder}
                value={(formData as Record<string, string | number | undefined>)[field.key] || ''}
                onChange={(e) => updateFormData(field.key as keyof LetterContext, field.type === 'number' ? parseInt(e.target.value) || '' : e.target.value)}
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Additional Context (optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
              rows={3}
              placeholder="Any other details you want to include..."
              value={formData.additionalContext || ''}
              onChange={(e) => updateFormData('additionalContext', e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleGenerate} className="w-full gap-2 bg-accent hover:bg-accent/90">
          <Sparkles className="w-4 h-4" />
          Generate Letter with AI
        </Button>
      </div>
    );
  };

  const renderGenerating = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
        <Sparkles className="w-8 h-8 text-accent" />
      </div>
      <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Drafting your letter...</h2>
      <p className="text-sm text-slate-600 mb-4 sm:mb-6">Using AI to create a professional, personalized letter</p>
      <Progress value={66} className="max-w-xs mx-auto" />
    </div>
  );

  const renderReview = () => {
    if (!generatedLetter) return null;

    return (
      <div className="space-y-3 sm:space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-1">Your Letter is Ready</h2>
            <p className="text-sm text-slate-600">Review, edit, and download your letter</p>
          </div>
          <Badge className="bg-green-100 text-green-700">
            <Check className="w-3 h-3 mr-1" />
            Generated
          </Badge>
        </div>

        {/* Letter Preview */}
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-900">{generatedLetter.subject}</h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditMode(!editMode)}>
                <Edit className="w-4 h-4 mr-1" />
                {editMode ? 'Preview' : 'Edit'}
              </Button>
            </div>
          </div>

          {editMode ? (
            <textarea
              className="w-full h-96 px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
            />
          ) : (
            <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                {editedBody || generatedLetter.body}
              </pre>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleCopy} variant="outline" className="gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
          <Button onClick={handleDownload} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button onClick={handleComplete} className="gap-2 bg-accent hover:bg-accent/90 ml-auto">
            Done
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Attachments Reminder */}
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <Clipboard className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 mb-2">Don't forget to attach:</h4>
              <ul className="space-y-1">
                {generatedLetter.suggestedAttachments.map((attachment, idx) => (
                  <li key={idx} className="text-sm text-amber-800 flex items-center gap-2">
                    <Check className="w-3 h-3" />
                    {attachment}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        {/* Next Steps */}
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-accent" />
            <h4 className="font-medium text-slate-900">After You Send</h4>
          </div>
          <ol className="space-y-2">
            {generatedLetter.nextSteps.map((step, idx) => (
              <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                <span className="w-5 h-5 bg-accent/10 text-accent rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {idx + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    );
  };

  const renderComplete = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Letter Complete!</h2>
      <p className="text-sm text-slate-600 mb-4 sm:mb-6">
        Your letter has been saved. Remember to review it one more time before sending.
      </p>
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={() => {
          setSelectedType(null);
          setGeneratedLetter(null);
          setCurrentStep('select-type');
        }}>
          Create Another Letter
        </Button>
        {onBack && (
          <Button onClick={onBack} className="bg-accent hover:bg-accent/90">
            Back to Coverage Coach
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            {onBack && currentStep === 'select-type' && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                AI Letter Drafting
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      {currentStep !== 'select-type' && currentStep !== 'complete' && (
        <div className="bg-white border-b border-gray-100 px-4 py-2">
          <div className="max-w-2xl mx-auto">
            <Progress
              value={
                currentStep === 'gather-info' ? 33 :
                currentStep === 'generating' ? 66 :
                currentStep === 'review' ? 100 : 0
              }
              className="h-1"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {currentStep === 'select-type' && renderTypeSelection()}
        {currentStep === 'gather-info' && renderGatherInfo()}
        {currentStep === 'generating' && renderGenerating()}
        {currentStep === 'review' && renderReview()}
        {currentStep === 'complete' && renderComplete()}
      </div>
    </div>
  );
}

export default LetterDraftingFlow;
