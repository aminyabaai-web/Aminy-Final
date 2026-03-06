import React from 'react';
import { CheckCircle, Clock, FileQuestion } from 'lucide-react';
import { Badge } from './ui/badge';

interface BenefitsStatus {
  status: 'submitted' | 'review' | 'approved' | 'info-requested';
  date: Date;
  details: string;
}

interface BenefitsStatusPanelProps {
  statuses: BenefitsStatus[];
}

export function BenefitsStatusPanel({ statuses = [] }: BenefitsStatusPanelProps) {
  const statusConfig = {
    submitted: { icon: Clock, color: 'blue', label: 'Submitted' },
    review: { icon: Clock, color: 'yellow', label: 'In review' },
    approved: { icon: CheckCircle, color: 'green', label: 'Approved' },
    'info-requested': { icon: FileQuestion, color: 'orange', label: 'More info requested' }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-lg font-semibold">Status</h3>
      
      {statuses.map((status, index) => {
        const config = statusConfig[status.status];
        const Icon = config.icon;
        
        return (
          <div key={index} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
            <div className={`p-2 bg-${config.color}-50 rounded-lg`}>
              <Icon className={`w-5 h-5 text-${config.color}-600`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge>{config.label}</Badge>
                <span className="text-xs text-muted-foreground">
                  {status.date.toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-slate-700">{status.details}</p>
            </div>
          </div>
        );
      })}

      <p className="text-xs text-center text-muted-foreground">
        I'll nudge you only when something needs you.
      </p>
    </div>
  );
}
