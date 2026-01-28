import React from 'react';
import { Clock, Target, AlertCircle, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface RBTQuickActionsProps {
  onLogSession: () => void;
  onReportBehavior: () => void;
  onMarkProgress: () => void;
  onRequestSupport: () => void;
}

export function RBTQuickActions({
  onLogSession,
  onReportBehavior,
  onMarkProgress,
  onRequestSupport
}: RBTQuickActionsProps) {
  const actions = [
    {
      id: 'log',
      label: 'Log Session',
      icon: Clock,
      onClick: onLogSession,
      color: 'blue'
    },
    {
      id: 'behavior',
      label: 'Report Behavior',
      icon: AlertCircle,
      onClick: onReportBehavior,
      color: 'amber'
    },
    {
      id: 'progress',
      label: 'Mark Progress',
      icon: Check,
      onClick: onMarkProgress,
      color: 'green'
    },
    {
      id: 'support',
      label: 'Request Support',
      icon: Target,
      onClick: onRequestSupport,
      color: 'purple'
    }
  ];

  return (
    <Card className="p-3 sm:p-4">
      <h3 className="font-semibold mb-4">RBT Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={action.onClick}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
