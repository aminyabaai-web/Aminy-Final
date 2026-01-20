import React, { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle2, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { generateClinicalReport } from '../lib/aminy-ai-brain';

interface AIReportGeneratorProps {
  childName: string;
  userTier: 'free' | 'core' | 'pro';
}

type ReportType = 'iep' | 'progress' | 'bcba-notes' | 'coverage-letter';

interface ReportOption {
  type: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  tierRequired: 'free' | 'core' | 'pro';
}

/**
 * AI-Powered Report Generator
 * 
 * Generates clinical-quality reports using the unified AI brain:
 * - IEP (Individualized Education Program)
 * - Progress Reports
 * - BCBA Session Notes
 * - Insurance Coverage Letters
 * 
 * All reports are personalized using child's actual data:
 * - Goals and progress
 * - Daily activity completion
 * - Junior mode engagement
 * - Parent-reported challenges
 * - Successful strategies
 */
export function AIReportGenerator({ childName, userTier }: AIReportGeneratorProps) {
  
  const [generatingType, setGeneratingType] = useState<ReportType | null>(null);
  const [generatedReports, setGeneratedReports] = useState<Map<ReportType, string>>(new Map());

  const reportOptions: ReportOption[] = [
    {
      type: 'progress',
      title: 'Progress Report',
      description: 'Comprehensive progress summary with goal tracking and data',
      icon: <FileText className="w-5 h-5" />,
      tierRequired: 'core'
    },
    {
      type: 'iep',
      title: 'IEP Document',
      description: 'School-ready IEP with SMART goals and accommodations',
      icon: <FileText className="w-5 h-5" />,
      tierRequired: 'pro'
    },
    {
      type: 'bcba-notes',
      title: 'BCBA Session Notes',
      description: 'Professional BCBA documentation for therapy sessions',
      icon: <FileText className="w-5 h-5" />,
      tierRequired: 'pro'
    },
    {
      type: 'coverage-letter',
      title: 'Insurance Letter',
      description: 'Medical necessity letter for insurance authorization',
      icon: <FileText className="w-5 h-5" />,
      tierRequired: 'pro'
    }
  ];

  const handleGenerateReport = async (reportType: ReportType) => {
    setGeneratingType(reportType);

    try {
      const report = await generateClinicalReport(reportType);
      
      setGeneratedReports(prev => new Map(prev).set(reportType, report));
      toast.success(`${reportOptions.find(r => r.type === reportType)?.title} generated!`);
      
    } catch (error) {
      toast.error("We couldn't create that report right now. Mind trying again?");
    } finally {
      setGeneratingType(null);
    }
  };

  const handleDownload = (reportType: ReportType) => {
    const report = generatedReports.get(reportType);
    if (!report) return;

    const reportTitle = reportOptions.find(r => r.type === reportType)?.title || 'Report';
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${childName}-${reportTitle.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Report downloaded!');
  };

  const canAccessReport = (tierRequired: string): boolean => {
    const tierLevels = { free: 0, core: 1, pro: 2 };
    return tierLevels[userTier] >= tierLevels[tierRequired as keyof typeof tierLevels];
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-1">AI-Generated Reports</h3>
        <p className="text-sm text-muted-foreground">
          Professional clinical documents using {childName}'s real progress data
        </p>
      </div>

      <div className="grid gap-3">
        {reportOptions.map((option) => {
          const hasAccess = canAccessReport(option.tierRequired);
          const isGenerated = generatedReports.has(option.type);
          const isGenerating = generatingType === option.type;

          return (
            <Card key={option.type} className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  hasAccess ? 'bg-accent/10 text-accent' : 'bg-slate-100 text-slate-400'
                }`}>
                  {option.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{option.title}</h4>
                    {!hasAccess && (
                      <Badge variant="outline" className="text-[10px]">
                        {option.tierRequired === 'pro' ? 'Plus' : 'Core'}+ only
                      </Badge>
                    )}
                    {isGenerated && (
                      <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                        Generated
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleGenerateReport(option.type)}
                      disabled={!hasAccess || isGenerating}
                      className="h-8"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-3 h-3 mr-1.5" />
                          {isGenerated ? 'Regenerate' : 'Generate'}
                        </>
                      )}
                    </Button>

                    {isGenerated && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(option.type)}
                        className="h-8"
                      >
                        <Download className="w-3 h-3 mr-1.5" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview if generated */}
              {isGenerated && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs text-muted-foreground bg-slate-50 p-3 rounded max-h-32 overflow-y-auto">
                    {generatedReports.get(option.type)?.substring(0, 300)}...
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Info footer */}
      <Card className="p-3 bg-accent/5 border-accent/20">
        <div className="flex items-start gap-2 text-xs">
          <FileText className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-accent mb-1">AI-Powered Clinical Documents</p>
            <p className="text-muted-foreground">
              All reports use {childName}'s actual progress data, goals, daily activities, 
              and parent-reported outcomes. Perfect for sharing with schools, therapists, 
              and insurance companies.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
