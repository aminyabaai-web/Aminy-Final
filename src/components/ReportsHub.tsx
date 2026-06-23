// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Reports Hub Component
 * For Parent Hub - allows parents to generate and manage PDF reports
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useReports, type ReportType as HookReportType } from '../hooks/useReports';
import { ReportType } from '../lib/reportBuilder';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Share,
  Trash2,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  ExternalLink,
  Loader2,
  AlertCircle,
  Mail,
  Sparkles
} from 'lucide-react';

interface ReportsHubProps {
  childId: string;
  childName: string;
  accessToken?: string;
  userTier?: string;
}

export function ReportsHub({ childId, childName, accessToken, userTier = 'free' }: ReportsHubProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [reportType, setReportType] = useState<ReportType>('parent');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeGoals, setIncludeGoals] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const {
    reports,
    currentReport,
    loading,
    error,
    createReport,
    fetchReports,
    removeReport,
    shareReportWithProvider,
    downloadReport,
  } = useReports({ accessToken });

  // Load reports on mount
  useEffect(() => {
    if (childId && accessToken) {
      fetchReports(childId);
    }
  }, [childId, accessToken, fetchReports]);

  const handleCreateReport = async () => {
    if (!accessToken) {
      toast.error('Please sign in to generate reports');
      return;
    }

    // Check tier restrictions
    if (reportType === 'iep' || reportType === 'bcba' || reportType === 'insurance') {
      if (userTier !== 'premium') {
        toast.error('Professional reports require Pro Plus plan');
        return;
      }
    }

    try {
      // Bridge between reportBuilder.ReportType and useReports.ReportType
      const report = await createReport(reportType as unknown as HookReportType, {
        dateRange: { start: new Date(dateRange.start), end: new Date(dateRange.end) },
        includeCharts,
        childName,
      });

      toast.success('Report generated successfully! 🎉');
      setShowCreateDialog(false);

      // Auto-download
      if (report) {
        downloadReport(report.id);
      }
    } catch (err) {
      toast.error('Failed to generate report. Please try again.');
    }
  };

  const handleShareReport = async () => {
    if (!selectedReportId || !shareEmail) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      await shareReportWithProvider(selectedReportId, shareEmail, shareMessage);
      toast.success(`Report shared with ${shareEmail}`);
      setShowShareDialog(false);
      setShareEmail('');
      setShareMessage('');
      setSelectedReportId(null);
    } catch (err) {
      toast.error('Failed to share report');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    const confirmed = confirm('Are you sure you want to delete this report?');
    if (confirmed) {
      try {
        await removeReport(reportId);
        toast.success('Report deleted');
      } catch (err) {
        toast.error('Failed to delete report');
      }
    }
  };

  const reportTypeLabels: Partial<Record<ReportType, { name: string; icon: string; description: string }>> = {
    parent: { 
      name: 'Parent Summary', 
      icon: '📊', 
      description: 'Easy-to-read progress overview for you' 
    },
    provider: { 
      name: 'Provider Report', 
      icon: '👩‍⚕️', 
      description: 'Clinical summary to share with therapists' 
    },
    iep: { 
      name: 'IEP Report', 
      icon: '🎓', 
      description: 'Detailed report for school meetings' 
    },
    progress: { 
      name: 'Progress Report', 
      icon: '📈', 
      description: 'Milestone tracking and achievements' 
    },
    bcba: { 
      name: 'BCBA Notes', 
      icon: '📋', 
      description: 'Professional behavior analysis notes' 
    },
    insurance: { 
      name: 'Insurance Letter', 
      icon: '🏥', 
      description: 'Documentation for insurance claims' 
    },
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-primary mb-1">Progress You Can See — Powered by AI, Grounded in ABA</h2>
          <p className="text-sm text-muted-foreground">
            Track {childName}'s progress with behavioral insights that matter
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-accent hover:bg-accent/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* Reports List */}
      {loading && reports.length === 0 ? (
        <Card className="p-8">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
            <p className="text-muted-foreground">Loading your reports...</p>
          </div>
        </Card>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-[#8A9BA8] mx-auto mb-4" />
          <h3 className="text-lg text-primary mb-2">No reports yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Generate your first report to see {childName}'s progress over time
          </p>
          <Button onClick={() => setShowCreateDialog(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Create Report
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {reports.map((report) => {
            const reportTypeKey = (report.reportType ?? report.type) as keyof typeof reportTypeLabels;
            const typeInfo = reportTypeLabels[reportTypeKey] ?? { name: 'Report', icon: '📄', description: '' };
            const expiresAt = report.expiresAt ?? new Date(report.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
            const isExpired = new Date(expiresAt) < new Date();
            const daysUntilExpiry = Math.ceil(
              (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            return (
              <Card key={report.reportId ?? report.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{typeInfo.icon}</div>
                    <div>
                      <h4 className="font-semibold text-primary">{typeInfo.name}</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {typeInfo.description}
                      </p>
                    </div>
                  </div>
                  {isExpired && (
                    <Badge variant="destructive" className="text-sm">
                      Expired
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>Generated {new Date(report.generatedAt ?? report.createdAt).toLocaleDateString()}</span>
                  </div>
                  {!isExpired && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>Expires in {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {!isExpired && (
                    <>
                      <Button
                        onClick={() => downloadReport(report.id)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Download className="w-3 h-3 mr-2" />
                        Download
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedReportId(report.reportId ?? report.id);
                          setShowShareDialog(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Share className="w-3 h-3 mr-2" />
                        Share
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => handleDeleteReport(report.reportId ?? report.id)}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Report Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate New Report</DialogTitle>
            <DialogDescription>
              Create a professional report showing {childName}'s progress
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            {/* Report Type Selection */}
            <div>
              <Label className="text-sm mb-3 block">Report Type</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(reportTypeLabels) as ReportType[]).map((type) => {
                  const info = reportTypeLabels[type]!;
                  if (!info) return null;
                  const requiresPro = ['iep', 'bcba', 'insurance'].includes(type);
                  const isLocked = requiresPro && userTier !== 'premium';

                  return (
                    <button
                      key={type}
                      onClick={() => !isLocked && setReportType(type)}
                      disabled={isLocked}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        reportType === type
                          ? 'border-accent bg-accent/5'
                          : isLocked
                          ? 'border-[#E8E4DF] bg-[#FAF7F2] opacity-50 cursor-not-allowed'
                          : 'border-[#E8E4DF] hover:border-accent/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xl">{info.icon}</span>
                        {isLocked && <Sparkles className="w-3 h-3 text-[#8A9BA8]" />}
                      </div>
                      <div className="font-medium text-sm text-primary">{info.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">{info.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Start Date</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">End Date</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Include charts & graphs</Label>
                <Switch checked={includeCharts} onCheckedChange={setIncludeCharts} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Include goal tracking</Label>
                <Switch checked={includeGoals} onCheckedChange={setIncludeGoals} />
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleCreateReport}
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center italic">
              Reports expire after 7 days for your privacy and security
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Report Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Report</DialogTitle>
            <DialogDescription>
              Send this report securely to a provider or therapist
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label className="text-sm mb-2 block">Provider's Email</Label>
              <Input
                type="email"
                placeholder="doctor@example.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-sm mb-2 block">Message (optional)</Label>
              <Input
                placeholder="Hi Dr. Smith, here's Emma's latest progress report..."
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
              />
            </div>

            <Button
              onClick={handleShareReport}
              disabled={loading || !shareEmail}
              className="w-full bg-accent hover:bg-accent/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Report
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
