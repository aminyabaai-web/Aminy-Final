import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { DisclaimerFooter } from './DisclaimerFooter';
import { UrgentHelpModal } from './UrgentHelpModal';
import { HelpCenter } from './HelpCenter';
import { ChildProfileChip } from './ChildProfileChip';
import { CoverageChatFlow, CoverageResponses } from './CoverageChatFlow';
import { CoverageClaritySummary, CoverageSummaryData } from './CoverageClaritySummary';
import { useDisplayNames } from '../lib/name-store';
import { toast } from 'sonner';
import {
  Bell,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Phone,
  Clock,
  DollarSign,
  Calendar,
  Users,
  ArrowRight,
  Download,
  Upload,
  Mail,
  Building,
  CreditCard,
  HelpCircle,
  ExternalLink,
  Zap,
  Target,
  TrendingUp,
  MessageCircle,
  Sparkles
} from 'lucide-react';

interface CoverageCoachProps {
  userData: {
    parentName: string;
    childName: string;
  };
  userTier?: string;
  connectorData?: Record<string, unknown>;
  onPaywallTrigger?: () => void;
}

interface BenefitItem {
  id: string;
  category: 'therapy' | 'equipment' | 'medication' | 'assessment';
  title: string;
  description: string;
  status: 'covered' | 'not_covered' | 'unsure' | 'pending';
  copay?: string;
  notes?: string;
  lastUpdated: string;
  nextSteps?: string[];
}

interface InsuranceProvider {
  name: string;
  memberId: string;
  groupNumber: string;
  customerService: string;
  website: string;
}

export function CoverageCoach({ 
  userData, 
  userTier = 'starter',
  connectorData,
  onPaywallTrigger 
}: CoverageCoachProps) {
  const { caregiverShort, childShort } = useDisplayNames();
  const [showUrgentHelp, setShowUrgentHelp] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<string | null>(null);
  const [showChatFlow, setShowChatFlow] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [coverageResponses, setCoverageResponses] = useState<CoverageResponses | null>(null);
  const [savedSummaries, setSavedSummaries] = useState<(CoverageSummaryData & { id: string; savedAt: string })[]>([]);

  // Safe data extraction
  const safeUserData = userData || { parentName: 'Parent', childName: 'Child' };
  const safeChildName = safeUserData.childName || childShort || 'Child';
  const safeCaregiverName = safeUserData.parentName || caregiverShort || 'Parent';

  // Mock insurance data
  const [insuranceProvider] = useState<InsuranceProvider>({
    name: 'Blue Cross Blue Shield',
    memberId: 'ABC123456789',
    groupNumber: 'GRP001',
    customerService: '1-800-555-0123',
    website: 'https://bcbs.com'
  });

  // Mock benefits data
  const [benefits, setBenefits] = useState<BenefitItem[]>([
    {
      id: '1',
      category: 'therapy',
      title: 'Applied Behavior Analysis (ABA)',
      description: 'Comprehensive ABA therapy sessions',
      status: 'covered',
      copay: '$25 per session',
      notes: 'Good news — your plan likely covers ABA under CPT 97153/97155. Here\'s exactly what to ask for. Want me to email this to your plan rep?',
      lastUpdated: '2 days ago',
      nextSteps: [
        'Submit prior authorization request',
        'Find in-network ABA provider',
        'Schedule initial assessment'
      ]
    },
    {
      id: '2',
      category: 'therapy',
      title: 'Speech-Language Therapy',
      description: 'Speech and language intervention services',
      status: 'covered',
      copay: '$30 per session',
      notes: 'Covered 2 sessions per week',
      lastUpdated: '1 week ago',
      nextSteps: [
        'Get referral from pediatrician',
        'Find in-network speech therapist',
        'Schedule evaluation'
      ]
    },
    {
      id: '3',
      category: 'therapy',
      title: 'Occupational Therapy',
      description: 'Sensory and motor skills therapy',
      status: 'covered',
      copay: '$30 per session',
      notes: 'Covered 2 sessions per week',
      lastUpdated: '1 week ago',
      nextSteps: [
        'Get pediatrician referral',
        'Schedule OT evaluation',
        'Submit therapy plan'
      ]
    },
    {
      id: '4',
      category: 'assessment',
      title: 'Autism Diagnostic Evaluation',
      description: 'Comprehensive autism assessment (ADOS-2, ADI-R)',
      status: 'covered',
      copay: '$50',
      notes: 'One evaluation per year, requires specialist',
      lastUpdated: '3 days ago',
      nextSteps: []
    },
    {
      id: '5',
      category: 'equipment',
      title: 'Communication Device (AAC)',
      description: 'Augmentative and alternative communication device',
      status: 'unsure',
      notes: 'Need to verify coverage for specific device models',
      lastUpdated: '1 week ago',
      nextSteps: [
        'Contact insurance for device coverage',
        'Get evaluation from speech therapist',
        'Research covered device options'
      ]
    },
    {
      id: '6',
      category: 'medication',
      title: 'ADHD Medications',
      description: 'Medications for attention and hyperactivity',
      status: 'not_covered',
      notes: 'Not covered under current plan - exploring alternatives',
      lastUpdated: '5 days ago',
      nextSteps: [
        'Discuss generic alternatives with doctor',
        'Apply for manufacturer assistance program',
        'Consider plan upgrade during open enrollment'
      ]
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'covered': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'not_covered': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'unsure': return <HelpCircle className="w-5 h-5 text-amber-600" />;
      case 'pending': return <Clock className="w-5 h-5 text-blue-600" />;
      default: return <HelpCircle className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'covered': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
      case 'not_covered': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
      case 'unsure': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400';
      case 'pending': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'therapy': return <Users className="w-4 h-4" />;
      case 'equipment': return <Zap className="w-4 h-4" />;
      case 'medication': return <Target className="w-4 h-4" />;
      case 'assessment': return <FileText className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const updateBenefitStatus = (benefitId: string, status: 'covered' | 'not_covered' | 'unsure') => {
    setBenefits(prev => prev.map(benefit => 
      benefit.id === benefitId 
        ? { ...benefit, status, lastUpdated: 'Just now' }
        : benefit
    ));
  };

  const handleCallInsurance = () => {
    window.open(`tel:${insuranceProvider.customerService}`, '_blank');
  };

  const handleVisitWebsite = () => {
    window.open(insuranceProvider.website, '_blank');
  };

  const handleDownloadSummary = () => {
    if (userTier === 'starter' && onPaywallTrigger) {
      onPaywallTrigger();
      return;
    }

    const summary = {
      childName: safeChildName,
      insurance: insuranceProvider,
      benefits: benefits,
      generatedDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeChildName}-insurance-summary-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStartCoverageChat = () => {
    setShowChatFlow(true);
  };

  const handleChatComplete = (responses: CoverageResponses) => {
    setCoverageResponses(responses);
    setShowChatFlow(false);
    setShowSummary(true);
  };

  const handleSaveSummary = async (summaryData: CoverageSummaryData) => {
    // Save to local state and localStorage
    const newSummary = {
      ...summaryData,
      id: Date.now().toString(),
      savedAt: new Date().toISOString()
    };
    
    setSavedSummaries(prev => [...prev, newSummary]);
    
    // Also save to localStorage for persistence
    const existingSummaries = JSON.parse(localStorage.getItem('aminy-coverage-summaries') || '[]');
    localStorage.setItem('aminy-coverage-summaries', JSON.stringify([...existingSummaries, newSummary]));
    
    toast.success('Coverage summary saved to Reports!');
  };

  const handleEmailSummary = async (summaryData: CoverageSummaryData) => {
    // In a real app, this would call the backend to send an email
    // For now, we'll simulate it
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success(`Coverage summary emailed to ${safeCaregiverName}!`);
  };

  // Load saved summaries on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('aminy-coverage-summaries');
    if (saved) {
      try {
        setSavedSummaries(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved summaries:', e);
      }
    }
  }, []);

  // Calculate coverage statistics
  const totalBenefits = benefits.length;
  const coveredBenefits = benefits.filter(b => b.status === 'covered').length;
  const coveragePercentage = Math.round((coveredBenefits / totalBenefits) * 100);

  // Show chat flow
  if (showChatFlow) {
    return (
      <div className="h-screen">
        <CoverageChatFlow
          childName={safeChildName}
          parentName={safeCaregiverName}
          onComplete={handleChatComplete}
          onCancel={() => setShowChatFlow(false)}
        />
      </div>
    );
  }

  // Show summary
  if (showSummary && coverageResponses) {
    return (
      <CoverageClaritySummary
        responses={coverageResponses}
        childName={safeChildName}
        parentName={safeCaregiverName}
        onSave={handleSaveSummary}
        onEmail={handleEmailSummary}
        onClose={() => {
          setShowSummary(false);
          setCoverageResponses(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-xl text-slate-900 dark:text-slate-100">Coverage Coach</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Navigate insurance benefits for {safeChildName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUrgentHelp(true)}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <Bell className="w-4 h-4" />
              </Button>
              <ChildProfileChip 
                child={{
                  name: safeChildName,
                  profileImage: undefined
                }}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        {/* AI-Powered Coverage Chat CTA */}
        <Card className="mb-8 p-6 bg-gradient-to-br from-teal-50 to-white border-2 border-teal-200">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Get Your Coverage Clarity Summary</h2>
              <p className="text-slate-700 mb-4">
                Answer a few quick questions and I'll create a personalized report showing exactly what's covered, 
                estimated costs, and your next steps — all in plain language.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={handleStartCoverageChat}
                  className="bg-teal-500 hover:bg-teal-600 gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Start Coverage Chat
                  <ArrowRight className="w-4 h-4" />
                </Button>
                {savedSummaries.length > 0 && (
                  <Badge variant="secondary" className="self-center">
                    {savedSummaries.length} saved {savedSummaries.length === 1 ? 'summary' : 'summaries'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Coverage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 sm:gap-6 mb-8">
          <Card className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-slate-100">Coverage Rate</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">{coveragePercentage}%</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {coveredBenefits} of {totalBenefits} benefits covered
            </div>
            <Progress value={coveragePercentage} className="mt-3" />
          </Card>

          <Card className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-slate-900 dark:text-slate-100">Est. Monthly Cost</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">$340</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Based on current coverage
            </div>
          </Card>

          <Card className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-slate-900 dark:text-slate-100">Next Review</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">30</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Days until open enrollment
            </div>
          </Card>
        </div>

        {/* Insurance Provider Info */}
        <Card className="mb-8">
          <div className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Building className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Insurance Information
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Provider</label>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {insuranceProvider.name}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Member ID</label>
                  <div className="font-mono text-slate-900 dark:text-slate-100">
                    {insuranceProvider.memberId}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Group Number</label>
                  <div className="font-mono text-slate-900 dark:text-slate-100">
                    {insuranceProvider.groupNumber}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={handleCallInsurance}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Phone className="w-4 h-4 mr-3" />
                  Call Customer Service
                  <span className="ml-auto text-sm font-mono">
                    {insuranceProvider.customerService}
                  </span>
                </Button>
                
                <Button
                  onClick={handleVisitWebsite}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <ExternalLink className="w-4 h-4 mr-3" />
                  Visit Provider Website
                </Button>
                
                <Button
                  onClick={handleDownloadSummary}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-3" />
                  Download Summary
                  {userTier === 'starter' && <Badge variant="secondary" className="ml-2">Pro</Badge>}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Benefits Status */}
        <Card className="mb-8">
          <div className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Benefits Status
                </h2>
              </div>
              
              {userTier === 'starter' && (
                <Button
                  onClick={onPaywallTrigger}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Unlock All Features
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4">
              {benefits.slice(0, userTier === 'starter' ? 3 : benefits.length).map((benefit) => (
                <div
                  key={benefit.id}
                  className={`benefits-card p-4 rounded-lg border transition-all duration-200 ${
                    benefit.status === 'covered' ? 'benefits-card-covered' : 
                    benefit.status === 'not_covered' ? 'benefits-card-not-covered' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        {getCategoryIcon(benefit.category)}
                      </div>
                      <div className="flex-1">
                        <h3 className="benefits-card-title font-medium text-slate-900 dark:text-slate-100">
                          {benefit.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusIcon(benefit.status)}
                      <Badge className={getStatusColor(benefit.status)}>
                        {benefit.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {benefit.copay && (
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                        <CreditCard className="w-3 h-3" />
                        Copay: <span className="font-medium">{benefit.copay}</span>
                      </span>
                    </div>
                  )}

                  {benefit.notes && (
                    <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {benefit.notes}
                      </p>
                    </div>
                  )}

                  {benefit.nextSteps && benefit.nextSteps.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                        Next Steps:
                      </h4>
                      <ul className="space-y-1">
                        {benefit.nextSteps.map((step, index) => (
                          <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                            <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Updated {benefit.lastUpdated}
                    </span>
                    
                    <div className="benefits-status-chip-group">
                      <button
                        role="radio"
                        aria-checked={benefit.status === 'covered'}
                        data-status="covered"
                        className="benefits-status-chip"
                        onClick={() => updateBenefitStatus(benefit.id, 'covered')}
                      >
                        Covered
                      </button>
                      <button
                        role="radio"
                        aria-checked={benefit.status === 'unsure'}
                        data-status="unsure"
                        className="benefits-status-chip"
                        onClick={() => updateBenefitStatus(benefit.id, 'unsure')}
                      >
                        Unsure
                      </button>
                      <button
                        role="radio"
                        aria-checked={benefit.status === 'not_covered'}
                        data-status="not_covered"
                        className="benefits-status-chip"
                        onClick={() => updateBenefitStatus(benefit.id, 'not_covered')}
                      >
                        Not Covered
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {userTier === 'starter' && benefits.length > 3 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-amber-900 dark:text-amber-100">
                        {benefits.length - 3} More Benefits Available
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Upgrade to see all your coverage options and get personalized recommendations.
                      </p>
                    </div>
                    <Button
                      onClick={onPaywallTrigger}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Upgrade Now
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <div className="p-4 sm:p-5 md:p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Quick Actions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <Button variant="outline" className="h-auto p-4 justify-start">
                <Upload className="w-4 h-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Upload Documents</div>
                  <div className="text-sm text-slate-500">Add insurance cards or EOBs</div>
                </div>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 justify-start">
                <Mail className="w-4 h-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Email Summary</div>
                  <div className="text-sm text-slate-500">Send to care team or provider</div>
                </div>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 justify-start">
                <Calendar className="w-4 h-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Set Reminders</div>
                  <div className="text-sm text-slate-500">Authorization deadlines</div>
                </div>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Modals */}
      {showUrgentHelp && (
        <UrgentHelpModal onClose={() => setShowUrgentHelp(false)} />
      )}

      {showHelpCenter && (
        <HelpCenter onClose={() => setShowHelpCenter(false)} />
      )}

      <DisclaimerFooter />
    </div>
  );
}