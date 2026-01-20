import React from 'react';
import { FileText, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

export function WeeklyOutcomesPDF() {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const handleDownload = () => {
    // Implement PDF generation
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">Weekly Outcomes PDF</h3>
            <Badge variant="outline">Core Tier</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Last 7 days: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </p>
        </div>
        <Button onClick={handleDownload}>
          <FileText className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Preview Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-slate-900">12</p>
          <p className="text-sm text-muted-foreground">Activities Completed</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-slate-900">85%</p>
          <p className="text-sm text-muted-foreground">Compliance Rate</p>
        </div>
      </div>
    </Card>
  );
}
