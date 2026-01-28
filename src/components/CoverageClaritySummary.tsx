import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { CoverageResponses } from './CoverageChatFlow';
import {
  Shield,
  CheckCircle,
  FileText,
  Download,
  Mail,
  Phone,
  ExternalLink,
  AlertCircle,
  Info,
  Sparkles,
  ChevronRight,
  Loader2
} from 'lucide-react';

interface CoverageClaritySummaryProps {
  responses: CoverageResponses;
  childName: string;
  parentName: string;
  onSave?: (summaryData: any) => void;
  onEmail?: (summaryData: any) => void;
  onClose?: () => void;
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  estimatedCost?: string;
  coverageLikelihood: 'likely' | 'possible' | 'unlikely';
}

export function CoverageClaritySummary({
  responses,
  childName,
  parentName,
  onSave,
  onEmail,
  onClose
}: CoverageClaritySummaryProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);

  // Generate recommendations based on responses
  const generateRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    // Primary insurance recommendations
    if (responses.primaryInsurance?.hasInsurance) {
      recommendations.push({
        title: 'Verify ABA Therapy Coverage',
        description: `Your ${responses.primaryInsurance.provider || 'insurance plan'} likely covers ABA therapy under CPT codes 97153 and 97155. This is usually your best covered service.`,
        priority: 'high',
        actionItems: [
          'Call member services and ask: "Does my plan cover ABA therapy for autism?"',
          'Request specific CPT codes: 97153, 97155, 97156, 97157',
          'Ask about session limits and prior authorization requirements',
          'Get the coverage details in writing via email'
        ],
        estimatedCost: '$25-50 copay per session',
        coverageLikelihood: 'likely'
      });
    }

    // Respite services
    if (responses.respiteServices?.interested) {
      recommendations.push({
        title: 'Explore Respite Care Options',
        description: 'Respite gives you time to recharge. Many states offer respite through Medicaid waivers or HCBS programs.',
        priority: responses.respiteServices.interested === 'yes' ? 'high' : 'medium',
        actionItems: [
          'Contact your state\'s HCBS (Home and Community Based Services) program',
          'Ask about autism-specific Medicaid waivers in your state',
          'Check if your private insurance covers "caregiver support services"',
          'Look into respite voucher programs through local autism organizations'
        ],
        estimatedCost: responses.secondaryCoverage?.type === 'medicaid' ? 'Often $0 with Medicaid waiver' : '$15-25/hour',
        coverageLikelihood: responses.secondaryCoverage?.type === 'medicaid' ? 'likely' : 'possible'
      });
    }

    // Habilitation services
    if (responses.habilitationServices?.serviceTypes && responses.habilitationServices.serviceTypes.length > 0) {
      const services = responses.habilitationServices.serviceTypes;
      
      if (services.includes('speech')) {
        recommendations.push({
          title: 'Speech Therapy Coverage',
          description: 'Speech therapy is typically well-covered for developmental delays and autism.',
          priority: 'high',
          actionItems: [
            'Get a referral from your pediatrician',
            'Ask insurance about "medically necessary speech therapy" coverage',
            'Confirm if evaluation is covered separately from treatment',
            'Request a list of in-network speech-language pathologists'
          ],
          estimatedCost: '$30-50 copay per session',
          coverageLikelihood: 'likely'
        });
      }

      if (services.includes('ot')) {
        recommendations.push({
          title: 'Occupational Therapy Coverage',
          description: 'OT for sensory processing and motor skills is usually covered when medically necessary.',
          priority: 'high',
          actionItems: [
            'Ask about "occupational therapy for sensory integration"',
            'Verify coverage for both evaluation and ongoing treatment',
            'Check session limits per year',
            'Find in-network pediatric OTs with autism experience'
          ],
          estimatedCost: '$30-50 copay per session',
          coverageLikelihood: 'likely'
        });
      }

      if (services.includes('aba')) {
        recommendations.push({
          title: 'Applied Behavior Analysis (ABA)',
          description: 'ABA is the gold standard for autism therapy and is covered by most plans under federal mandate.',
          priority: 'high',
          actionItems: [
            'Verify your plan covers ABA under CPT 97153/97155',
            'Ask about prior authorization process and timeline',
            'Request list of in-network BCBA providers',
            'Confirm if assessment is covered before therapy starts'
          ],
          estimatedCost: '$25-50 copay per session, or $0 with some Medicaid plans',
          coverageLikelihood: 'likely'
        });
      }
    }

    // Secondary coverage benefits
    if (responses.secondaryCoverage?.type === 'medicaid') {
      recommendations.push({
        title: 'Maximize Medicaid Benefits',
        description: 'Medicaid often covers services private insurance won\'t, including community-based supports and wraparound services.',
        priority: 'high',
        actionItems: [
          'Apply for autism-specific Medicaid waiver in your state',
          'Ask about EPSDT (Early and Periodic Screening) benefits',
          'Look into "habilitation services" coverage',
          'Inquire about parent training and family support services'
        ],
        estimatedCost: 'Usually $0 copay',
        coverageLikelihood: 'likely'
      });
    }

    return recommendations;
  };

  const recommendations = generateRecommendations();

  const summaryData = {
    generatedDate: new Date().toISOString(),
    childName,
    parentName,
    responses,
    recommendations,
    nextSteps: [
      'Call your insurance to verify coverage',
      'Request prior authorization for recommended services',
      'Find in-network providers',
      'Schedule initial evaluations'
    ]
  };

  const handleDownload = () => {
    // Generate HTML report
    const htmlReport = generateHTMLReport(summaryData);
    const blob = new Blob([htmlReport], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Coverage-Clarity-Summary-${childName}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Coverage summary downloaded!');
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(summaryData);
      toast.success('Coverage summary saved to Reports');
    } catch (error) {
      toast.error('Failed to save summary');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmail = async () => {
    if (!onEmail) return;
    
    setIsEmailing(true);
    try {
      await onEmail(summaryData);
      toast.success('Coverage summary emailed!');
    } catch (error) {
      toast.error('Failed to email summary');
      console.error('Email error:', error);
    } finally {
      setIsEmailing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getCoverageLikelihoodBadge = (likelihood: string) => {
    switch (likelihood) {
      case 'likely':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Likely Covered</Badge>;
      case 'possible':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Possibly Covered</Badge>;
      case 'unlikely':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Check Coverage</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Coverage Clarity Summary</h1>
              <p className="text-teal-100">Generated for {childName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-teal-100">
            <Sparkles className="w-4 h-4" />
            <span>Created {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Quick Actions */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Download Report
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-teal-500 hover:bg-teal-600">
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Save to Reports
            </Button>
            <Button onClick={handleEmail} disabled={isEmailing} variant="outline" className="gap-2">
              {isEmailing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Email Summary
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="ghost">
                Close
              </Button>
            )}
          </div>
        </Card>

        {/* Key Insights */}
        <Card className="p-6 border-l-4 border-l-teal-500">
          <div className="flex items-start gap-3 mb-4">
            <Info className="w-5 h-5 text-teal-500 mt-0.5" />
            <div>
              <h2 className="font-semibold text-lg mb-2">What We Found</h2>
              <div className="space-y-2 text-sm text-slate-700">
                {responses.primaryInsurance?.hasInsurance && (
                  <p>✓ You have {responses.primaryInsurance.provider} coverage</p>
                )}
                {responses.secondaryCoverage?.type && responses.secondaryCoverage.type !== 'none' && (
                  <p>✓ Secondary coverage through {responses.secondaryCoverage.type.toUpperCase()}</p>
                )}
                {responses.habilitationServices?.serviceTypes && (
                  <p>✓ Interested in {responses.habilitationServices.serviceTypes.length} therapy services</p>
                )}
                {responses.respiteServices?.interested && (
                  <p>✓ Respite services are a priority</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Personalized Recommendations */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-4">Your Personalized Coverage Recommendations</h2>
          <div className="space-y-3 sm:space-y-4">
            {recommendations.map((rec, index) => (
              <Card key={index} className="p-4 sm:p-5 md:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-slate-900">{rec.title}</h3>
                      <Badge className={getPriorityColor(rec.priority)}>
                        {rec.priority} priority
                      </Badge>
                      {getCoverageLikelihoodBadge(rec.coverageLikelihood)}
                    </div>
                    <p className="text-slate-700 mb-4">{rec.description}</p>
                  </div>
                </div>

                {rec.estimatedCost && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Estimated Cost: {rec.estimatedCost}</span>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Action Items:</h4>
                  <ul className="space-y-2">
                    {rec.actionItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                        <ChevronRight className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <Card className="p-6 bg-gradient-to-br from-teal-50 to-white border-teal-200">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-500" />
            Your Next Steps
          </h2>
          <ol className="space-y-3">
            {summaryData.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                  {index + 1}
                </div>
                <span className="text-slate-700 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </Card>

        {/* Important Reminders */}
        <Card className="p-6 border-l-4 border-l-amber-500">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-2">Important Reminders</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• Coverage details can vary — always verify with your specific plan</li>
                <li>• Get coverage confirmations in writing (email is best)</li>
                <li>• Prior authorization can take 2-4 weeks, so start early</li>
                <li>• Keep records of all calls, including date, time, and rep name</li>
                <li>• If denied, you have the right to appeal — don't give up!</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Generate HTML report for download
function generateHTMLReport(data: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coverage Clarity Summary - ${data.childName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #334155; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #0891b2; border-bottom: 3px solid #0891b2; padding-bottom: 10px; }
    h2 { color: #0f172a; margin-top: 30px; }
    .section { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0891b2; }
    .recommendation { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 15px 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-right: 8px; }
    .badge.high { background: #fee2e2; color: #991b1b; }
    .badge.medium { background: #fef3c7; color: #92400e; }
    .badge.likely { background: #dcfce7; color: #166534; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; font-size: 14px; color: #64748b; }
  </style>
</head>
<body>
  <h1>Coverage Clarity Summary for ${data.childName}</h1>
  <p><strong>Generated:</strong> ${new Date(data.generatedDate).toLocaleDateString()}</p>
  
  <div class="section">
    <h2>Your Coverage Snapshot</h2>
    ${data.responses.primaryInsurance?.hasInsurance ? `<p>✓ Primary Insurance: ${data.responses.primaryInsurance.provider || 'On file'}</p>` : ''}
    ${data.responses.secondaryCoverage?.type && data.responses.secondaryCoverage.type !== 'none' ? `<p>✓ Secondary Coverage: ${data.responses.secondaryCoverage.type.toUpperCase()}</p>` : ''}
    ${data.responses.habilitationServices?.serviceTypes ? `<p>✓ Services of Interest: ${data.responses.habilitationServices.serviceTypes.join(', ')}</p>` : ''}
  </div>

  <h2>Personalized Recommendations</h2>
  ${data.recommendations.map((rec: any) => `
    <div class="recommendation">
      <h3>${rec.title} <span class="badge ${rec.priority}">${rec.priority} priority</span> <span class="badge likely">${rec.coverageLikelihood}</span></h3>
      <p>${rec.description}</p>
      ${rec.estimatedCost ? `<p><strong>Estimated Cost:</strong> ${rec.estimatedCost}</p>` : ''}
      <h4>Action Items:</h4>
      <ul>
        ${rec.actionItems.map((item: string) => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  `).join('')}

  <div class="section">
    <h2>Your Next Steps</h2>
    <ol>
      ${data.nextSteps.map((step: string) => `<li>${step}</li>`).join('')}
    </ol>
  </div>

  <div class="footer">
    <p><strong>Important:</strong> This summary is based on general coverage patterns and your responses. Always verify specific coverage details with your insurance provider. Coverage can vary by plan, state, and individual circumstances.</p>
    <p>Generated by Aminy Coverage Coach • ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>
  `.trim();
}
