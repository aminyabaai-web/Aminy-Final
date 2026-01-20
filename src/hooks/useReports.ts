/**
 * Reports Hook
 * Manages report generation and storage
 */

import { useState, useCallback } from 'react';

export interface Report {
  id: string;
  type: string;
  title: string;
  createdAt: Date;
  status: 'pending' | 'generating' | 'ready' | 'error';
  url?: string;
}

export interface ReportOptions {
  dateRange?: { start: Date; end: Date };
  includeCharts?: boolean;
  includeNotes?: boolean;
}

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(async (type: string, options?: ReportOptions) => {
    setIsGenerating(true);
    setError(null);

    try {
      const newReport: Report = {
        id: `report_${Date.now()}`,
        type,
        title: `${type} Report`,
        createdAt: new Date(),
        status: 'ready',
      };

      setReports(prev => [...prev, newReport]);
      return newReport;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const deleteReport = useCallback((id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
  }, []);

  const downloadReport = useCallback(async (id: string) => {
    const report = reports.find(r => r.id === id);
    if (report?.url) {
      window.open(report.url, '_blank');
    }
  }, [reports]);

  return {
    reports,
    isGenerating,
    error,
    generateReport,
    deleteReport,
    downloadReport,
  };
}
