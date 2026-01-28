import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface PostVisitSummaryProps {
  providerName: string;
  sessionDate: Date;
  sessionType: string;
  keyTakeaways: string[];
  actionItems: { task: string; completed: boolean }[];
}

export function PostVisitSummary({ 
  providerName, 
  sessionDate, 
  sessionType, 
  keyTakeaways,
  actionItems 
}: PostVisitSummaryProps) {
  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Visit Summary</h3>
        <Badge>AI-Generated</Badge>
      </div>

      {/* Session Details */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Session Details</h4>
        <p className="text-sm text-muted-foreground">
          {sessionType} with {providerName}
        </p>
        <p className="text-xs text-muted-foreground">
          {sessionDate.toLocaleDateString()} at {sessionDate.toLocaleTimeString()}
        </p>
      </div>

      {/* Key Takeaways */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Key Takeaways</h4>
        <ul className="space-y-2">
          {keyTakeaways.map((takeaway, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-slate-700">{takeaway}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Items */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Action Items</h4>
        <div className="space-y-2">
          {actionItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <input 
                type="checkbox" 
                checked={item.completed}
                className="rounded"
                readOnly
              />
              <span className="text-sm">{item.task}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Here's what we covered and what's next
      </p>

      <Button className="w-full">
        Approve to apply to plan
      </Button>
    </Card>
  );
}
