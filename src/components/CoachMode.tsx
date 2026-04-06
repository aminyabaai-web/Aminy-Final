// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  X,
  Play,
  Pause,
  SkipForward,
  Mic,
  Printer,
  Clock,
  ChevronRight,
  CheckCircle,
  Sparkles,
  AlertCircle,
  Smile,
  Meh,
  Frown
} from 'lucide-react';

/**
 * COACH MODE - COMPREHENSIVE IN-ACTIVITY STEP-BY-STEP GUIDANCE
 * 
 * Complete flow with all screens and states:
 * 1. Activity Overlay - Step-by-step prompts with progress
 * 2. Active State - Current step highlighted with timer and controls
 * 3. Paused State - Activity paused with resume option
 * 4. Completion Screen - Celebration, reflection, and next steps
 * 
 * Features:
 * - Numbered steps (1,2,3...) with visual cues
 * - Estimated time per step with running timer
 * - Progress bar showing step X of Y
 * - Large action buttons: Start/Pause/Skip (16px padding, 8px radius)
 * - Mic button "What do I say?" with voice prompt suggestions
 * - "Try this instead" button for live alternatives
 * - Celebration animation on completion
 * - Quick reflection with 3 emoji reactions (😊 Great | 😐 Okay | 😞 Challenging)
 * - "What's next?" card showing next activity
 * - Offline printable button with printer icon (generates PDF)
 * 
 * Design Tokens:
 * - 8px border radius
 * - 16px button padding
 * - H2: 22px
 * - Body: 16px
 * - Teal accent (#0891b2)
 * - Proper WCAG AA contrast
 * - Focus rings on all interactive elements
 * - 44px minimum touch targets
 */

interface CoachModeStep {
  id: number;
  instruction: string;
  visualCue?: string;
  estimatedTime: number; // in minutes
  voicePrompts?: string[];
  alternatives?: string[];
}

interface CoachModeActivity {
  title: string;
  totalSteps: number;
  steps: CoachModeStep[];
  materials?: string;
  duration: number;
}

interface CoachModeProps {
  activity: CoachModeActivity;
  onClose: () => void;
  onComplete: () => void;
  nextActivity?: {
    title: string;
    duration: number;
    materials: string;
  };
}

export function CoachMode({ activity, onClose, onComplete, nextActivity }: CoachModeProps) {
  const [currentState, setCurrentState] = useState<'overview' | 'active' | 'completion'>('overview');
  const [currentStep, setCurrentStep] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showVoicePrompts, setShowVoicePrompts] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [reflection, setReflection] = useState<'great' | 'okay' | 'challenging' | null>(null);

  // Timer for active state
  useEffect(() => {
    if (currentState === 'active' && !isPaused) {
      const timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentState, isPaused]);

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = (currentStep / activity.totalSteps) * 100;

  // Handle step navigation
  const handleNextStep = () => {
    if (currentStep < activity.totalSteps) {
      setCurrentStep(prev => prev + 1);
      setShowVoicePrompts(false);
      setShowAlternatives(false);
      toast.success(`Step ${currentStep + 1} of ${activity.totalSteps}`);
    } else {
      // Last step complete - move to completion
      setCurrentState('completion');
    }
  };

  const handleSkipStep = () => {
    if (currentStep < activity.totalSteps) {
      setCurrentStep(prev => prev + 1);
      toast.info('Step skipped');
    } else {
      setCurrentState('completion');
    }
  };

  // Handle reactions (swap activity)
  const handleReaction = (reaction: string) => {
    toast.info(`We'll find something ${reaction === 'too-hard' ? 'easier' : reaction === 'too-long' ? 'shorter' : 'with different materials'}`);
    onClose();
  };

  // Handle print activity - generates PDF-friendly version
  const handlePrint = () => {
    // Create print-friendly view
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activity.title} - Activity Guide</title>
          <style>
            @page { margin: 1in; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              line-height: 1.6;
              color: #1e293b;
              max-width: 8.5in;
              margin: 0 auto;
              padding: 20px;
            }
            h1 { 
              font-size: 28px; 
              font-weight: 600; 
              margin-bottom: 8px;
              color: #0891b2;
            }
            h2 { 
              font-size: 22px; 
              font-weight: 600; 
              margin-top: 24px;
              margin-bottom: 12px;
              color: #1e293b;
            }
            .meta { 
              font-size: 14px; 
              color: #64748b; 
              margin-bottom: 24px;
            }
            .step { 
              margin-bottom: 24px; 
              padding: 16px;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              page-break-inside: avoid;
            }
            .step-number { 
              display: inline-block;
              width: 32px;
              height: 32px;
              background: #0891b2;
              color: white;
              border-radius: 50%;
              text-align: center;
              line-height: 32px;
              font-weight: 600;
              margin-right: 8px;
            }
            .step-header {
              display: flex;
              align-items: center;
              margin-bottom: 8px;
              font-weight: 600;
            }
            .step-time {
              margin-left: auto;
              padding: 4px 12px;
              background: #f1f5f9;
              border-radius: 4px;
              font-size: 12px;
              color: #475569;
            }
            .instruction { 
              font-size: 16px; 
              margin-bottom: 8px;
              color: #334155;
            }
            .visual-cue {
              font-size: 14px;
              color: #64748b;
              font-style: italic;
              margin-top: 8px;
            }
            .prompts-section {
              margin-top: 12px;
              padding: 12px;
              background: #f0f9ff;
              border-left: 3px solid #0891b2;
              border-radius: 4px;
            }
            .prompts-section h3 {
              font-size: 14px;
              font-weight: 600;
              margin: 0 0 8px 0;
              color: #0c4a6e;
            }
            .prompts-section p {
              margin: 4px 0;
              font-size: 14px;
              color: #0c4a6e;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
            }
            @media print {
              body { font-size: 12pt; }
              .step { border: 1px solid #ccc; }
            }
          </style>
        </head>
        <body>
          <h1>${activity.title}</h1>
          <div class="meta">
            <strong>Duration:</strong> ${activity.duration} minutes | 
            <strong>Materials:</strong> ${activity.materials || 'None required'} |
            <strong>Steps:</strong> ${activity.totalSteps}
          </div>
          
          ${activity.steps.map((step, idx) => `
            <div class="step">
              <div class="step-header">
                <span class="step-number">${step.id}</span>
                <span>Step ${step.id}</span>
                <span class="step-time">${step.estimatedTime} min</span>
              </div>
              <div class="instruction">${step.instruction}</div>
              ${step.visualCue ? `<div class="visual-cue">💡 ${step.visualCue}</div>` : ''}
              
              ${step.voicePrompts && step.voicePrompts.length > 0 ? `
                <div class="prompts-section">
                  <h3>What to say:</h3>
                  ${step.voicePrompts.map(prompt => `<p>• ${prompt}</p>`).join('')}
                </div>
              ` : ''}
              
              ${step.alternatives && step.alternatives.length > 0 ? `
                <div class="prompts-section" style="background: #fef3c7; border-left-color: #f59e0b;">
                  <h3>Alternative approaches:</h3>
                  ${step.alternatives.map(alt => `<p>• ${alt}</p>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
          
          <div class="footer">
            <p>Generated from Aminy Coach Mode • ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `;
    
    // Open print dialog with the content
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
      }, 250);
      
      toast.success('Print preview opened', {
        description: 'Ready to save as PDF or print',
        duration: 3000
      });
    } else {
      toast.error('Pop-up blocked', {
        description: 'Please allow pop-ups to print',
        duration: 4000
      });
    }
  };

  // Handle completion reflection
  const handleReflection = (mood: 'great' | 'okay' | 'challenging') => {
    setReflection(mood);
    toast.success('Thank you for sharing!');
  };

  // Get current step data
  const currentStepData = activity.steps[currentStep - 1];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Coach Mode Card - 8px radius, proper touch targets */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl md:w-full bg-white rounded-[8px] shadow-2xl z-50 flex flex-col max-h-[90vh]">
        
        {/* SCREEN 1: OVERVIEW */}
        {currentState === 'overview' && (
          <>
            {/* Header - H2: 22px as per design tokens */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div className="flex-1">
                <h2 className="text-[22px] font-semibold text-primary mb-2">
                  {activity.title}
                </h2>
                <div className="flex items-center gap-3 text-[16px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {activity.duration} min
                  </span>
                  {activity.materials && (
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      {activity.materials}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] p-2 hover:bg-gray-100 rounded-[8px] transition-colors focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none"
                aria-label="Close coach mode"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Step {currentStep} of {activity.totalSteps}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Steps List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 sm:space-y-4">
              {activity.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    index + 1 === currentStep
                      ? 'border-accent bg-accent/5'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Step Number and Time Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                        index + 1 === currentStep
                          ? 'bg-accent text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {step.id}
                      </div>
                      <span className="font-medium">Step {step.id}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {step.estimatedTime} min
                    </Badge>
                  </div>

                  {/* Instruction */}
                  <p className="text-base text-gray-700 leading-relaxed">
                    {step.instruction}
                  </p>

                  {/* Visual Cue */}
                  {step.visualCue && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="w-4 h-4" />
                      <span>{step.visualCue}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Control Buttons */}
            <div className="p-6 border-t border-gray-200 space-y-3">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="flex-1"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button
                  onClick={() => setCurrentState('active')}
                  className="flex-1 bg-accent hover:bg-accent/90"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Activity
                </Button>
              </div>
            </div>
          </>
        )}

        {/* SCREEN 2: ACTIVE STATE */}
        {currentState === 'active' && currentStepData && (
          <>
            {/* Header with Timer */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-primary mb-2">
                  {activity.title}
                </h2>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-accent" />
                  <span className="text-xl font-mono font-semibold text-accent">
                    {formatTime(elapsedTime)}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-accent">
                  Step {currentStep} of {activity.totalSteps}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Current Step Highlighted */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="p-6 rounded-xl border-2 border-accent bg-accent/5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-semibold text-lg">
                      {currentStepData.id}
                    </div>
                    <span className="font-semibold text-lg">Current Step</span>
                  </div>
                  <Badge className="bg-accent text-white">
                    {currentStepData.estimatedTime} min
                  </Badge>
                </div>

                <p className="text-lg text-gray-900 leading-relaxed mb-4">
                  {currentStepData.instruction}
                </p>

                {currentStepData.visualCue && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4" />
                    <span>{currentStepData.visualCue}</span>
                  </div>
                )}
              </div>

              {/* Voice Prompts Section */}
              <div className="mb-4">
                <Button
                  variant="outline"
                  onClick={() => setShowVoicePrompts(!showVoicePrompts)}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    What do I say?
                  </span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showVoicePrompts ? 'rotate-90' : ''}`} />
                </Button>
                
                {showVoicePrompts && currentStepData.voicePrompts && (
                  <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    {currentStepData.voicePrompts.map((prompt, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-medium text-blue-900">{idx + 1}</span>
                        </div>
                        <p className="text-sm text-blue-900">{prompt}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Try This Instead Section */}
              {currentStepData.alternatives && (
                <div className="mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowAlternatives(!showAlternatives)}
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Try this instead
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${showAlternatives ? 'rotate-90' : ''}`} />
                  </Button>
                  
                  {showAlternatives && (
                    <div className="mt-2 p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                      {currentStepData.alternatives.map((alt, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-purple-900">{alt}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Reaction Chips */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-muted-foreground mb-2">Not working?</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleReaction('too-hard')}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-full text-sm hover:border-accent hover:bg-accent/5 transition-all"
                  >
                    😅 Too hard
                  </button>
                  <button
                    onClick={() => handleReaction('too-long')}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-full text-sm hover:border-accent hover:bg-accent/5 transition-all"
                  >
                    ⏱️ Too long
                  </button>
                  <button
                    onClick={() => handleReaction('no-supplies')}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-full text-sm hover:border-accent hover:bg-accent/5 transition-all"
                  >
                    🏠 No supplies
                  </button>
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="p-6 border-t border-gray-200 space-y-3">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsPaused(!isPaused)}
                  className="flex-1"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleNextStep}
                  className="flex-1 bg-accent hover:bg-accent/90"
                >
                  {currentStep < activity.totalSteps ? 'Next Step' : 'Complete'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              <button
                onClick={handleSkipStep}
                className="w-full text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                Skip this step
              </button>
            </div>
          </>
        )}

        {/* SCREEN 3: COMPLETION */}
        {currentState === 'completion' && (
          <>
            {/* Celebration Header */}
            <div className="p-6 border-b border-gray-200 text-center">
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <CheckCircle className="w-20 h-20 text-green-500 animate-in zoom-in-50 duration-500" />
                  <Sparkles className="w-8 h-8 text-accent absolute -top-2 -right-2 animate-pulse" />
                </div>
              </div>
              <h1 className="text-3xl font-semibold text-primary mb-2">
                Great job!
              </h1>
              <p className="text-muted-foreground">
                You completed {activity.title} in {formatTime(elapsedTime)}
              </p>
            </div>

            {/* Reflection Section */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 sm:space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-3">
                  How did it go?
                </h3>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => handleReflection('great')}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all ${
                      reflection === 'great'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <Smile className={`w-10 h-10 mx-auto mb-2 ${reflection === 'great' ? 'text-green-500' : 'text-green-400'}`} />
                    <div className="font-medium text-sm">Great</div>
                  </button>
                  <button
                    onClick={() => handleReflection('okay')}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all ${
                      reflection === 'okay'
                        ? 'border-gray-500 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Meh className={`w-10 h-10 mx-auto mb-2 ${reflection === 'okay' ? 'text-gray-500' : 'text-gray-400'}`} />
                    <div className="font-medium text-sm">Okay</div>
                  </button>
                  <button
                    onClick={() => handleReflection('challenging')}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all ${
                      reflection === 'challenging'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <Frown className={`w-10 h-10 mx-auto mb-2 ${reflection === 'challenging' ? 'text-orange-500' : 'text-orange-400'}`} />
                    <div className="font-medium text-sm">Challenging</div>
                  </button>
                </div>
              </div>

              {/* What's Next */}
              {nextActivity && (
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-3">
                    What's next?
                  </h3>
                  <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-accent transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{nextActivity.title}</h4>
                      <Badge variant="secondary">{nextActivity.duration} min</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Sparkles className="w-4 h-4" />
                      <span>{nextActivity.materials}</span>
                    </div>
                    <Button size="sm" className="w-full">
                      Start now
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 space-y-3">
              <Button
                onClick={onComplete}
                className="w-full bg-accent hover:bg-accent/90"
              >
                Back to Plan
              </Button>
              <button
                onClick={onClose}
                className="w-full text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                Done for now
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// Example usage with mock data
export function CoachModeExample() {
  const [showCoachMode, setShowCoachMode] = useState(false);

  const mockActivity: CoachModeActivity = {
    title: 'Morning Visual Schedule',
    totalSteps: 3,
    duration: 5,
    materials: 'Paper & markers',
    steps: [
      {
        id: 1,
        instruction: 'Draw 4-6 boxes on a piece of paper, one for each morning activity',
        visualCue: 'Use bright colors to make it engaging',
        estimatedTime: 2,
        voicePrompts: [
          '"Let\'s make your morning schedule together!"',
          '"Can you help me draw boxes for your routine?"',
          '"Each box will show what we do in the morning"'
        ],
        alternatives: [
          'Use sticky notes instead of drawing boxes',
          'Take photos of each activity and print them',
          'Use a whiteboard for reusable schedules'
        ]
      },
      {
        id: 2,
        instruction: 'In each box, draw or write one morning activity (wake up, breakfast, brush teeth, get dressed)',
        visualCue: 'Let your child help choose which activities to include',
        estimatedTime: 2,
        voicePrompts: [
          '"What do we do first in the morning?"',
          '"Can you draw yourself eating breakfast?"',
          '"Great! What comes next?"'
        ]
      },
      {
        id: 3,
        instruction: 'Hang the schedule where your child can see it every morning',
        visualCue: 'Eye-level placement works best',
        estimatedTime: 1,
        voicePrompts: [
          '"Let\'s find the perfect spot for your schedule"',
          '"Now you can check off each thing you do!"',
          '"This will help you remember your morning routine"'
        ]
      }
    ]
  };

  const mockNextActivity = {
    title: 'Turn-Taking Game',
    duration: 10,
    materials: 'Any toy'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Today's Activities</h1>
        
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-lg">Morning Visual Schedule</h3>
            <Badge variant="secondary">5 min</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Create a simple picture schedule for the day
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Materials: Paper & markers</span>
          </div>
          <Button
            onClick={() => setShowCoachMode(true)}
            className="w-full bg-accent hover:bg-accent/90"
          >
            Start now
          </Button>
        </div>
      </div>

      {showCoachMode && (
        <CoachMode
          activity={mockActivity}
          onClose={() => setShowCoachMode(false)}
          onComplete={() => {
            setShowCoachMode(false);
            toast.success('Activity completed!');
          }}
          nextActivity={mockNextActivity}
        />
      )}
    </div>
  );
}
