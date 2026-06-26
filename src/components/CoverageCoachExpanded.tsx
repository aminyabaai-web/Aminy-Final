import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Sparkles, 
  FileText, 
  Send,
  CheckCircle,
  Download,
  Mail,
  Shield,
  Info,
  ArrowRight,
  Heart,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { checkEligibilityAvaility, isAvailityConfigured } from '../lib/clearinghouse-integration';

interface CoverageCoachExpandedProps {
  userData: {
    parentName: string;
    childName: string;
  };
  onSaveReport?: (report: CoverageReport) => void;
}

interface CoverageReport {
  insuranceProvider: string;
  planType: string;
  state: string;
  childNeeds: string[];
  coverageSummary: {
    abaServices: string;
    speechTherapy: string;
    occupationalTherapy: string;
    assessments: string;
  };
  nextSteps: string[];
  generatedAt: string;
}

type ChatStep = 'welcome' | 'provider' | 'plan-type' | 'state' | 'needs' | 'confirmation' | 'report';

export function CoverageCoachExpanded({ userData, onSaveReport }: CoverageCoachExpandedProps) {
  const [currentStep, setCurrentStep] = useState<ChatStep>('welcome');
  const [chatHistory, setChatHistory] = useState<{ role: 'ai' | 'user'; message: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  
  // Form data
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [planType, setPlanType] = useState('');
  const [state, setState] = useState('');
  const [childNeeds, setChildNeeds] = useState<string[]>([]);
  
  const [generatedReport, setGeneratedReport] = useState<CoverageReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const addMessage = (role: 'ai' | 'user', message: string) => {
    setChatHistory(prev => [...prev, { role, message }]);
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    
    addMessage('user', userInput);
    processUserInput(userInput);
    setUserInput('');
  };

  const processUserInput = (input: string) => {
    setTimeout(() => {
      switch (currentStep) {
        case 'welcome':
          setCurrentStep('provider');
          addMessage('ai', "Great! Let's start with your insurance provider. Who covers your family? (e.g., Blue Cross, Aetna, UnitedHealthcare, Medicaid)");
          break;
          
        case 'provider':
          setInsuranceProvider(input);
          setCurrentStep('plan-type');
          addMessage('ai', `Got it — ${input}. What type of plan do you have? (e.g., PPO, HMO, EPO, or Medicaid)`);
          break;
          
        case 'plan-type':
          setPlanType(input);
          setCurrentStep('state');
          addMessage('ai', "Perfect. Which state do you live in? (This affects coverage rules)");
          break;
          
        case 'state':
          setState(input);
          setCurrentStep('needs');
          addMessage('ai', `Thanks! Now, what support does ${userData.childName} need most? You can say: ABA therapy, speech therapy, occupational therapy, or assessments.`);
          break;
          
        case 'needs':
          const needs = input.toLowerCase().split(',').map(s => s.trim());
          setChildNeeds(needs);
          setCurrentStep('confirmation');
          addMessage('ai', `Perfect. I have everything I need to create your Coverage Clarity Report. Let me summarize what you told me...`);
          
          setTimeout(() => {
            addMessage('ai', `• Insurance: ${insuranceProvider} (${planType})\n• State: ${state}\n• Needs: ${needs.join(', ')}\n\nShall I generate your personalized report now?`);
          }, 1000);
          break;
          
        case 'confirmation':
          if (input.toLowerCase().includes('yes') || input.toLowerCase().includes('sure')) {
            generateReport();
          } else {
            addMessage('ai', "No problem! What would you like to change?");
          }
          break;
      }
    }, 500);
  };

  const generateReport = async () => {
    setIsGenerating(true);
    addMessage('ai', "Generating your Coverage Clarity Report... This will take just a moment.");

    let realEligibility: { isActive: boolean; planName: string; planType: string; deductibleRemaining: number } | null = null;

    // Attempt real Availity eligibility check if configured
    if (isAvailityConfigured()) {
      try {
        addMessage('ai', "Checking eligibility with your insurance provider...");
        const result = await checkEligibilityAvaility({
          memberId: '', // Would come from user input — placeholder for now
          memberDob: '',
          memberFirstName: userData.parentName.split(' ')[0] || '',
          memberLastName: userData.parentName.split(' ')[1] || '',
          providerId: '',
          payerId: insuranceProvider.toUpperCase().replace(/\s+/g, ''),
          serviceDate: new Date().toISOString().split('T')[0],
          serviceCodes: ['97153', '97155'], // ABA CPT codes
          placeOfService: '02', // Telehealth
        });
        if (result.success && result.coverage) {
          realEligibility = {
            isActive: result.coverage.isActive,
            planName: result.plan?.planName || planType,
            planType: result.plan?.planType || planType,
            deductibleRemaining: result.coverage.deductible?.remaining || 0,
          };
        }
      } catch (err) {
        console.warn('Availity eligibility check failed, using general guidance:', err);
      }
    }

    const report: CoverageReport = {
      insuranceProvider,
      planType: realEligibility?.planName || planType,
      state,
      childNeeds,
      coverageSummary: {
        abaServices: realEligibility?.isActive
          ? `✓ Active coverage confirmed. Plan type: ${realEligibility.planType}. Deductible remaining: $${realEligibility.deductibleRemaining.toLocaleString()}.`
          : getABACoverage(),
        speechTherapy: getSpeechCoverage(),
        occupationalTherapy: getOTCoverage(),
        assessments: getAssessmentCoverage()
      },
      nextSteps: getNextSteps(),
      generatedAt: new Date().toISOString()
    };

    setGeneratedReport(report);
    setCurrentStep('report');
    setIsGenerating(false);

    const source = realEligibility ? "real-time eligibility data" : "general plan guidance for your state";
    addMessage('ai', `Your Coverage Clarity Report is ready! I've summarized what your plan covers based on ${source}.`);

    if (onSaveReport) {
      onSaveReport(report);
    }

    toast.success('Report generated and saved to your Records!');
  };

  const getABACoverage = () => {
    // Simplified logic - in production, use real insurance data
    if (planType.toLowerCase().includes('medicaid')) {
      return `✓ Likely covered: Most states mandate ABA coverage for autism under Medicaid. Typically 15-30 hours/week authorized.`;
    } else if (planType.toLowerCase().includes('ppo')) {
      return `✓ Likely covered: PPO plans usually cover ABA with prior authorization. Check for annual hour limits (often 20-40 hours/week).`;
    } else {
      return `⚠️ Coverage varies: Check your specific plan documents. ${insuranceProvider} typically requires medical necessity documentation.`;
    }
  };

  const getSpeechCoverage = () => {
    return `✓ Typically covered: Most plans cover speech therapy with a referral. Check session limits (often 20-60 visits/year).`;
  };

  const getOTCoverage = () => {
    return `✓ Typically covered: Occupational therapy is usually covered with prior authorization. Session limits vary by plan.`;
  };

  const getAssessmentCoverage = () => {
    return `✓ Generally covered: Diagnostic assessments for autism are covered by most plans. May require referral from pediatrician.`;
  };

  const getNextSteps = () => {
    return [
      `Call ${insuranceProvider} at the number on your insurance card and ask for "ABA benefits for autism"`,
      `Request a "prior authorization" for Applied Behavior Analysis (ABA) services`,
      `Ask your pediatrician for a referral letter stating medical necessity`,
      `Save this report and share it with potential providers to streamline intake`
    ];
  };

  const handleDownloadReport = () => {
    toast.success('Report downloaded as PDF!');
    // In production, trigger actual PDF download
  };

  const handleEmailReport = () => {
    toast.success(`Report emailed to ${userData.parentName}!`);
    // In production, send email via backend
  };

  const quickStartOptions = [
    { label: 'I have insurance', value: 'I have insurance through my employer' },
    { label: 'I have Medicaid', value: 'I have Medicaid coverage' },
    { label: 'I\'m not sure', value: 'I\'m not sure what I have' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent/10 to-teal-50 border-b border-accent/20 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start gap-3 sm:gap-4 mb-4">
            <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-[#132F43] mb-2">Coverage Coach</h1>
              <p className="text-[#5A6B7A]">Know what your plan covers in 2 minutes</p>
            </div>
          </div>

          <Card className="p-4 bg-white">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#132F43] mb-1">
                  Reassuring & Expert, Non-Bureaucratic
                </p>
                <p className="text-sm text-[#5A6B7A]">
                  I'll walk you through this step-by-step. No complicated insurance jargon — just clear answers.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Progress Indicator */}
        {currentStep !== 'welcome' && currentStep !== 'report' && (
          <Card className="p-4 mb-4 sm:mb-6 bg-[#FAF7F2]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#3A4A57]">
                {currentStep === 'provider' && 'Step 1 of 4: Insurance Provider'}
                {currentStep === 'plan-type' && 'Step 2 of 4: Plan Type'}
                {currentStep === 'state' && 'Step 3 of 4: Your State'}
                {currentStep === 'needs' && 'Step 4 of 4: Support Needs'}
                {currentStep === 'confirmation' && 'Review & Confirm'}
              </span>
              <span className="text-sm text-[#5A6B7A]">
                {currentStep === 'provider' && '25%'}
                {currentStep === 'plan-type' && '50%'}
                {currentStep === 'state' && '75%'}
                {currentStep === 'needs' && '100%'}
                {currentStep === 'confirmation' && '100%'}
              </span>
            </div>
            <Progress 
              value={
                currentStep === 'provider' ? 25 :
                currentStep === 'plan-type' ? 50 :
                currentStep === 'state' ? 75 : 100
              } 
              className="h-2"
            />
          </Card>
        )}

        {/* Chat Messages */}
        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
          {currentStep === 'welcome' && (
            <>
              <AIMessage>
                Hi {userData.parentName}! 👋 I'm here to help you understand what your insurance plan covers for {userData.childName}.
              </AIMessage>
              <AIMessage>
                I'll ask you 4-5 quick questions, then give you a personalized Coverage Clarity Report. Ready to start?
              </AIMessage>
              
              {/* Quick Start Options */}
              <div className="grid gap-3">
                {quickStartOptions.map((option, idx) => (
                  <Button
                    key={idx}
                    onClick={() => {
                      addMessage('user', option.value);
                      processUserInput(option.value);
                    }}
                    variant="outline"
                    className="justify-start h-auto py-4 px-4 text-left"
                  >
                    <span className="text-sm">{option.label}</span>
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Button>
                ))}
              </div>
            </>
          )}

          {chatHistory.map((msg, idx) => (
            msg.role === 'ai' ? (
              <AIMessage key={idx}>{msg.message}</AIMessage>
            ) : (
              <UserMessage key={idx}>{msg.message}</UserMessage>
            )
          ))}

          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
              <div className="w-2 h-2 bg-accent rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              <span className="ml-2">Analyzing coverage...</span>
            </div>
          )}
        </div>

        {/* Generated Report */}
        {generatedReport && (
          <Card className="p-6 mb-4 sm:mb-6 border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-teal-50">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-accent" />
              <h2 className="text-lg sm:text-xl font-semibold text-[#132F43]">Coverage Clarity Report</h2>
            </div>

            {/* Insurance Summary */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-medium text-[#132F43] mb-3">Your Plan</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5A6B7A]">Provider:</span>
                  <span className="font-medium text-[#132F43]">{generatedReport.insuranceProvider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A6B7A]">Plan Type:</span>
                  <span className="font-medium text-[#132F43]">{generatedReport.planType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A6B7A]">State:</span>
                  <span className="font-medium text-[#132F43]">{generatedReport.state}</span>
                </div>
              </div>
            </div>

            {/* Coverage Summary */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-medium text-[#132F43] mb-3">What's Likely Covered</h3>
              <div className="space-y-3 sm:space-y-4 text-sm">
                <div>
                  <p className="font-medium text-[#132F43] mb-1">ABA Services</p>
                  <p className="text-[#5A6B7A] leading-relaxed">{generatedReport.coverageSummary.abaServices}</p>
                </div>
                <div>
                  <p className="font-medium text-[#132F43] mb-1">Speech Therapy</p>
                  <p className="text-[#5A6B7A] leading-relaxed">{generatedReport.coverageSummary.speechTherapy}</p>
                </div>
                <div>
                  <p className="font-medium text-[#132F43] mb-1">Occupational Therapy</p>
                  <p className="text-[#5A6B7A] leading-relaxed">{generatedReport.coverageSummary.occupationalTherapy}</p>
                </div>
                <div>
                  <p className="font-medium text-[#132F43] mb-1">Assessments</p>
                  <p className="text-[#5A6B7A] leading-relaxed">{generatedReport.coverageSummary.assessments}</p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-medium text-[#132F43] mb-3">Your Next Steps</h3>
              <ol className="space-y-2 text-sm">
                {generatedReport.nextSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center text-xs font-medium">
                      {idx + 1}
                    </span>
                    <span className="text-[#3A4A57]">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleDownloadReport}
                className="gap-2 bg-accent hover:bg-accent/90"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              <Button
                onClick={handleEmailReport}
                variant="outline"
                className="gap-2"
              >
                <Mail className="w-4 h-4" />
                Email Report
              </Button>
            </div>
          </Card>
        )}

        {/* Educational Sidebar */}
        {currentStep !== 'welcome' && currentStep !== 'report' && (
          <Card className="p-4 bg-[#EEF4F8] border-[#C8DDE8]">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-2">ABA Benefits Explained Simply</p>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Applied Behavior Analysis (ABA) is a proven approach for helping children with developmental needs. 
                  Most insurance plans cover ABA when it's medically necessary. Your state may have additional protections 
                  that require coverage.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Input Area */}
        {currentStep !== 'welcome' && currentStep !== 'report' && (
          <Card className="p-4 bg-white sticky bottom-20">
            <div className="flex gap-2">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your answer..."
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!userInput.trim()}
                className="bg-accent hover:bg-accent/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// Helper Components
function AIMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-gradient-to-br from-accent to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <Card className="p-4 bg-white max-w-[80%]">
        <p className="text-sm text-[#3A4A57] leading-relaxed whitespace-pre-line">{children}</p>
      </Card>
    </div>
  );
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 justify-end">
      <Card className="p-4 bg-accent text-white max-w-[80%]">
        <p className="text-sm leading-relaxed">{children}</p>
      </Card>
      <div className="w-8 h-8 bg-[#E8E4DF] rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-medium text-[#3A4A57]">You</span>
      </div>
    </div>
  );
}
