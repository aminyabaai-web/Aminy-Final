// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Clinical Report Export Screen
 *
 * Three-step flow for parents to generate a clinical progress report PDF
 * they can share with their child's pediatrician, BCBA, or school.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle2,
  Stethoscope,
  Calendar,
  Activity,
  Brain,
  Shield,
  ClipboardList,
  Pill,
  GraduationCap,
  Users,
  BarChart3,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import type { ClinicalReportData } from '../lib/clinical-report-demo-data';
import { DEFAULT_SECTIONS } from '../lib/clinical-pdf-generator';
import type { ReportSections } from '../lib/clinical-pdf-generator';
import {
  exportCaregiverSummaryPdf,
  generateCaregiverSummary,
  mapCaregiverSummaryToClinicalReportData,
} from '../lib/caregiver-workflow';
import { useAuditedAction } from '../hooks/useAuditedAction';

// ============================================================================
// Types
// ============================================================================

interface ClinicalReportExportProps {
  childName: string;
  childId?: string;
  userTier?: string;
  onBack: () => void;
  onUpgrade?: () => void;
}

type RecipientType = 'pediatrician' | 'bcba' | 'specialist';
type Step = 'configure' | 'preview' | 'success';

interface SectionToggle {
  key: keyof ReportSections;
  label: string;
  icon: React.ReactNode;
  description: string;
  locked?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ClinicalReportExport({
  childName,
  childId,
  onBack,
}: ClinicalReportExportProps) {
  useAuditedAction('progress_report');
  const [step, setStep] = useState<Step>('configure');
  const [recipient, setRecipient] = useState<RecipientType>('pediatrician');
  const [sections, setSections] = useState<ReportSections>({ ...DEFAULT_SECTIONS });
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ClinicalReportData | null>(null);

  // Load report data from stored caregiver-summary records only.
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const summary = await generateCaregiverSummary({ childId });
        const data = mapCaregiverSummaryToClinicalReportData(summary);
        if (!cancelled) setReportData(data);
      } catch (err) {
        console.warn('Failed to load caregiver summary report data:', err);
        if (!cancelled) setReportData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [childId]);

  const toggleSection = useCallback((key: keyof ReportSections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!reportData) return;
    setGenerating(true);
    await new Promise(r => setTimeout(r, 600));

    try {
      const { doc, filename, reportData: generatedReportData } = await exportCaregiverSummaryPdf({
        childId,
        recipientType: recipient,
        sections,
      });
      setReportData(generatedReportData);
      doc.save(filename);
      setStep('success');
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  }, [childId, reportData, sections, recipient]);

  const enabledSectionCount = Object.values(sections).filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-mist flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B9080] mb-3" />
        <p className="text-sm text-[#5A6B7A]">Loading your clinical data...</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-mist flex flex-col items-center justify-center px-6 text-center">
        <FileText className="w-10 h-10 text-[#6B9080] mb-3" />
        <h1 className="text-lg font-semibold text-[#1B2733] mb-2">No caregiver summary available yet</h1>
        <p className="text-sm text-[#5A6B7A] mb-4">Complete onboarding, ask Aminy a question, or finish a daily-plan item before generating a provider report.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-[#6B9080] transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  const sectionToggles: SectionToggle[] = [
    { key: 'demographics', label: 'Demographics & Diagnosis', icon: <Users className="w-4 h-4" />, description: 'Name, DOB, diagnoses, diagnosis history', locked: true },
    { key: 'medications', label: 'Medications', icon: <Pill className="w-4 h-4" />, description: 'Current medications, dosages, prescribers' },
    { key: 'schoolInfo', label: 'School & Education', icon: <GraduationCap className="w-4 h-4" />, description: 'School, IEP/504, special ed supports' },
    { key: 'treatmentPlan', label: 'Treatment Plan', icon: <ClipboardList className="w-4 h-4" />, description: 'Hours, service level, supervising BCBA' },
    { key: 'goals', label: 'Goals & Progress', icon: <Activity className="w-4 h-4" />, description: 'Treatment goals with baseline → current → target', locked: true },
    { key: 'behaviorData', label: 'Behavioral Data', icon: <BarChart3 className="w-4 h-4" />, description: 'Target behaviors, ABC analysis, trends' },
    { key: 'assessments', label: 'Assessment Scores', icon: <Brain className="w-4 h-4" />, description: 'Clinical assessments + your screening results' },
    { key: 'sessions', label: 'Session Attendance', icon: <Calendar className="w-4 h-4" />, description: 'Attendance rate, hours, CPT breakdown' },
    { key: 'parentObservations', label: 'Parent Observations', icon: <Users className="w-4 h-4" />, description: 'Concerns, wins, home environment' },
    { key: 'recommendations', label: 'Recommendations', icon: <FileText className="w-4 h-4" />, description: 'Clinical recommendations for continued care', locked: true },
  ];

  // ── Configure Step ────────────────────────────────────────

  if (step === 'configure') {
    return (
      <div className="min-h-screen bg-mist">
        {/* Header */}
        <div
          className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 pb-6"
          style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top))' }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Clinical Report</h1>
              <p className="text-sm text-white/80">Share progress with {childName}'s care team</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
          {/* Info banner */}
          <div className="bg-[#6B9080]/10 border border-[#6B9080]/20 rounded-lg p-3 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#6B9080] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#6B9080]">
              This generates an encrypted clinical PDF you can share with your child's
              pediatrician, BCBA, or school. All data stays on your device.
            </p>
          </div>

          {/* Recipient type */}
          <div>
            <label className="text-sm font-medium text-[#3A4A57] mb-2 block">Report prepared for:</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'pediatrician', label: 'Pediatrician' },
                { value: 'bcba', label: 'BCBA' },
                { value: 'specialist', label: 'Specialist' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRecipient(opt.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    recipient === opt.value
                      ? 'bg-primary text-white border-[#6B9080]'
                      : 'bg-white text-[#5A6B7A] border-[#E8E4DF] hover:border-[#6B9080]/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Report period */}
          <div>
            <label className="text-sm font-medium text-[#3A4A57] mb-2 block">Report period:</label>
            <div className="bg-white rounded-lg border border-[#E8E4DF] p-3">
              <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
                <Calendar className="w-4 h-4 text-[#6B9080]" />
                <span>{reportData.reportPeriod.start} to {reportData.reportPeriod.end}</span>
              </div>
              <p className="text-sm text-[#8A9BA8] mt-1">3-month reporting window</p>
            </div>
          </div>

          {/* Section toggles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#3A4A57]">Include sections:</label>
              <span className="text-sm text-[#8A9BA8]">{enabledSectionCount} of {sectionToggles.length} selected</span>
            </div>
            <div className="bg-white rounded-lg border border-[#E8E4DF] divide-y divide-gray-100">
              {sectionToggles.map(toggle => (
                <button
                  key={toggle.key}
                  onClick={() => !toggle.locked && toggleSection(toggle.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    toggle.locked ? 'cursor-default' : 'hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    sections[toggle.key] ? 'bg-[#6B9080]/10 text-[#6B9080]' : 'bg-[#F0EDE8] text-[#8A9BA8]'
                  }`}>
                    {toggle.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-medium ${sections[toggle.key] ? 'text-[#1B2733]' : 'text-[#8A9BA8]'}`}>
                        {toggle.label}
                      </span>
                      {toggle.locked && (
                        <span className="text-xs bg-[#F0EDE8] text-[#5A6B7A] px-1.5 py-0.5 rounded">Required</span>
                      )}
                    </div>
                    <p className="text-sm text-[#8A9BA8] truncate">{toggle.description}</p>
                  </div>
                  <div className={`w-9 h-5 rounded-full flex items-center transition-colors ${
                    sections[toggle.key] ? 'bg-primary' : 'bg-[#E8E4DF]'
                  } ${toggle.locked ? 'opacity-50' : ''}`}>
                    <div
                      className="w-4 h-4 rounded-full bg-white shadow-sm ml-0.5 transition-transform"
                      style={{ transform: sections[toggle.key] ? 'translateX(16px)' : 'translateX(0)' }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={() => setStep('preview')}
            className="w-full bg-primary text-white rounded-lg py-3 font-medium flex items-center justify-center gap-2 hover:bg-[#6B9080] transition-colors"
          >
            Review & Download
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Preview Step ──────────────────────────────────────────

  if (step === 'preview') {
    const goals = reportData.treatmentPlan.goals;
    const avgProgress = goals.length > 0
      ? Math.round(goals.reduce((s, g) => s + g.current, 0) / goals.length)
      : 0;

    return (
      <div className="min-h-screen bg-mist">
        {/* Header */}
        <div
          className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 pb-6"
          style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top))' }}
        >
          <button
            onClick={() => setStep('configure')}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Edit Report
          </button>
          <h1 className="text-lg font-bold">Report Preview</h1>
          <p className="text-sm text-white/80">{reportData.child.firstName} {reportData.child.lastName} — {reportData.reportPeriod.start} to {reportData.reportPeriod.end}</p>
        </div>

        <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white rounded-lg border border-[#E8E4DF] p-3">
              <p className="text-sm text-[#8A9BA8]">Avg Goal Progress</p>
              <p className="text-2xl font-bold text-[#6B9080]">{avgProgress}%</p>
            </div>
            <div className="bg-white rounded-lg border border-[#E8E4DF] p-3">
              <p className="text-sm text-[#8A9BA8]">Attendance Rate</p>
              <p className="text-2xl font-bold text-[#6B9080]">{reportData.sessions.attendanceRate.toFixed(0)}%</p>
            </div>
            <div className="bg-white rounded-lg border border-[#E8E4DF] p-3">
              <p className="text-sm text-[#8A9BA8]">Treatment Hours</p>
              <p className="text-2xl font-bold text-[#1B2733]">{reportData.sessions.totalHours.toFixed(0)}</p>
            </div>
            <div className="bg-white rounded-lg border border-[#E8E4DF] p-3">
              <p className="text-sm text-[#8A9BA8]">Behavioral Trend</p>
              <p className={`text-lg font-bold flex items-center gap-1 ${
                reportData.behaviorData.overallTrend === 'improving' ? 'text-green-700' :
                reportData.behaviorData.overallTrend === 'declining' ? 'text-red-700' : 'text-blue-700'
              }`}>
                <span>{reportData.behaviorData.overallTrend === 'improving' ? '▲' : reportData.behaviorData.overallTrend === 'declining' ? '▼' : '●'}</span>
                {reportData.behaviorData.overallTrend.charAt(0).toUpperCase() + reportData.behaviorData.overallTrend.slice(1)}
              </p>
            </div>
          </div>

          {/* Goals snapshot */}
          <div className="bg-white rounded-lg border border-[#E8E4DF] p-3">
            <h3 className="text-sm font-semibold text-[#1B2733] mb-2">Treatment Goals ({goals.length})</h3>
            {goals.map(goal => (
              <div key={goal.id} className="flex items-center gap-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#3A4A57] truncate">{goal.domain}: {goal.title}</p>
                  <div className="w-full bg-[#F0EDE8] rounded-full h-1.5 mt-1">
                    <div
                      className={`h-1.5 rounded-full ${
                        goal.trendDirection === 'improving' ? 'bg-primary' : goal.trendDirection === 'declining' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${goal.current}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-[#5A6B7A] w-10 text-right">{goal.current}%</span>
              </div>
            ))}
          </div>

          {/* Assessments snapshot */}
          {sections.assessments && (
            <div className="bg-white rounded-lg border border-[#E8E4DF] p-3">
              <h3 className="text-sm font-semibold text-[#1B2733] mb-2">Assessments ({reportData.assessments.length})</h3>
              {reportData.assessments.map(a => (
                <div key={a.type} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-[#5A6B7A]">{a.name}</span>
                  <span className={`text-sm font-medium ${
                    (a.change ?? 0) < 0 ? 'text-green-700' : (a.change ?? 0) > 0 ? 'text-orange-600' : 'text-[#5A6B7A]'
                  }`}>
                    {a.score} {a.change != null ? `(${a.change > 0 ? '+' : ''}${a.change})` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Sections included */}
          <div className="bg-[#FAF7F2] rounded-lg border border-[#E8E4DF] p-3">
            <p className="text-xs text-[#5A6B7A] mb-1">Sections included: {enabledSectionCount}</p>
            <p className="text-xs text-[#8A9BA8]">
              {sectionToggles.filter(t => sections[t.key]).map(t => t.label).join(' · ')}
            </p>
          </div>

          {/* Download button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-primary text-white rounded-lg py-3 font-medium flex items-center justify-center gap-2 hover:bg-[#6B9080] transition-colors disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Clinical Report PDF
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Success Step ──────────────────────────────────────────

  return (
    <div className="min-h-screen bg-mist flex flex-col">
      <div
        className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 pb-6"
        style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top))' }}
      >
        <h1 className="text-lg font-bold">Report Downloaded</h1>
      </div>

      <div className="px-4 py-6 flex-1 flex flex-col items-center justify-start max-w-lg mx-auto w-full">
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-6 text-center w-full">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-[#1B2733] mb-1">Clinical Report Ready</h2>
          <p className="text-sm text-[#5A6B7A] mb-4">
            {reportData.child.firstName}'s clinical progress report has been downloaded to your device.
          </p>

          <div className="bg-[#6B9080]/10 rounded-lg p-3 text-left mb-4">
            <p className="text-xs font-medium text-[#6B9080] mb-1">Sharing tips:</p>
            <ul className="text-xs text-[#6B9080] space-y-1">
              <li>• Upload to your provider's patient portal</li>
              <li>• Bring a printed copy to your next appointment</li>
              <li>• Share via secure email with your care team</li>
              <li>• Provide to school IEP team during meetings</li>
            </ul>
          </div>

          <div className="bg-amber-50 rounded-lg p-3 text-left">
            <p className="text-xs text-amber-800">
              <span className="font-medium">Privacy note:</span> This PDF contains Protected Health Information (PHI).
              Only share with authorized care providers.
            </p>
          </div>
        </div>

        <div className="flex gap-3 w-full mt-4">
          <button
            onClick={() => setStep('configure')}
            className="flex-1 bg-white border border-[#E8E4DF] text-[#3A4A57] rounded-lg py-2.5 text-sm font-medium hover:bg-[#FAF7F2] transition-colors"
          >
            Generate Another
          </button>
          <button
            onClick={onBack}
            className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#6B9080] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClinicalReportExport;
