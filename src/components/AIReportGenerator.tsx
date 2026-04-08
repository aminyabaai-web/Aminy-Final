// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle2, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { generateClinicalReport } from '../lib/ai-engine';
import jsPDF from 'jspdf';

// ============================================================================
// PDF Generation Constants
// ============================================================================
const AMINY_BLUE = '#0891b2';
const AMINY_GREEN = '#43AA8B';
const GRAY_600 = '#4B5563';
const GRAY_400 = '#9CA3AF';

interface AIReportGeneratorProps {
  childName: string;
  userTier: 'free' | 'core' | 'pro';
}

type ReportType = 'iep' | 'progress' | 'bcba-notes' | 'coverage-letter';

// ============================================================================
// PDF Generation Function
// ============================================================================
function generateClinicalReportPDF(
  reportContent: string,
  reportType: ReportType,
  childName: string
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  const reportTitles: Record<ReportType, string> = {
    'progress': 'Progress Report',
    'iep': 'Individualized Education Program (IEP)',
    'bcba-notes': 'BCBA Session Notes',
    'coverage-letter': 'Insurance Coverage Letter'
  };

  // Helper to add new page if needed
  const checkPageBreak = (neededSpace: number = 30) => {
    if (yPos + neededSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      // Add header on new page
      doc.setFontSize(9);
      doc.setTextColor(GRAY_400);
      doc.text(`${reportTitles[reportType]} - ${childName}`, margin, yPos);
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin - 15, yPos);
      yPos += 10;
    }
  };

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(AMINY_BLUE);
  doc.text('Aminy', margin, yPos);
  yPos += 8;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY_600);
  doc.text(reportTitles[reportType], margin, yPos);
  yPos += 10;

  // Child info and date
  doc.setFontSize(11);
  doc.setTextColor(GRAY_400);
  doc.text(`Child: ${childName}`, margin, yPos);
  yPos += 6;
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`, margin, yPos);
  yPos += 12;

  // Confidentiality notice
  doc.setFillColor(255, 251, 235); // amber-50
  doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor('#92400E'); // amber-800
  doc.text('CONFIDENTIAL: This document contains protected health information (PHI).', margin + 5, yPos + 5);
  doc.text('Handle in accordance with HIPAA regulations.', margin + 5, yPos + 9);
  yPos += 18;

  // Horizontal line
  doc.setDrawColor(AMINY_BLUE);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Process report content - split into paragraphs and render
  const paragraphs = reportContent.split('\n\n');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY_600);

  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) return;

    // Check if it's a header (starts with # or all caps or ends with :)
    const isHeader = paragraph.startsWith('#') ||
                     paragraph.match(/^[A-Z\s]{10,}:?$/) ||
                     (paragraph.length < 50 && paragraph.endsWith(':'));

    if (isHeader) {
      checkPageBreak(15);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(AMINY_BLUE);
      const headerText = paragraph.replace(/^#+\s*/, '');
      doc.text(headerText, margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRAY_600);
    } else if (paragraph.startsWith('•') || paragraph.startsWith('-') || paragraph.startsWith('*')) {
      // Bullet points
      const bullets = paragraph.split('\n');
      bullets.forEach((bullet) => {
        checkPageBreak(8);
        const bulletText = bullet.replace(/^[•\-*]\s*/, '');
        const lines = doc.splitTextToSize(`• ${bulletText}`, contentWidth - 10);
        doc.text(lines, margin + 5, yPos);
        yPos += lines.length * 5 + 2;
      });
    } else {
      // Regular paragraph
      checkPageBreak(15);
      const lines = doc.splitTextToSize(paragraph, contentWidth);
      lines.forEach((line: string) => {
        checkPageBreak(6);
        doc.text(line, margin, yPos);
        yPos += 5;
      });
      yPos += 3;
    }
  });

  // Footer on last page
  yPos = pageHeight - 25;
  doc.setDrawColor(GRAY_400);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  doc.setFontSize(8);
  doc.setTextColor(GRAY_400);
  doc.text('This report was generated by Aminy AI using child progress data.', margin, yPos);
  yPos += 4;
  doc.text('For clinical decisions, please consult with qualified healthcare providers.', margin, yPos);
  yPos += 4;
  doc.text(`Generated by Aminy | support@aminy.ai | www.aminy.ai`, margin, yPos);

  return doc;
}

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

    try {
      const reportTitle = reportOptions.find(r => r.type === reportType)?.title || 'Report';
      const doc = generateClinicalReportPDF(report, reportType, childName);
      const filename = `${childName}-${reportTitle.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast.success('PDF report downloaded!');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const canAccessReport = (tierRequired: string): boolean => {
    const tierLevels = { free: 0, core: 1, pro: 2 };
    return tierLevels[userTier] >= tierLevels[tierRequired as keyof typeof tierLevels];
  };

  return (
    <div className="space-y-3 sm:space-y-4">
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
            <Card key={option.type} className="p-3 sm:p-4">
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
                        Download PDF
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
