import React, { useState } from 'react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Calendar, Target, Heart } from 'lucide-react';

interface ApprovalItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
}

interface ApproveScreenProps {
  onApprove: (items: ApprovalItem[]) => void;
  onSimplify: () => void;
  onNotNow: () => void;
}

export function ApproveScreen({ onApprove, onSimplify, onNotNow }: ApproveScreenProps) {
  const [items, setItems] = useState<ApprovalItem[]>([
    {
      id: 'routine',
      title: "Today's routine",
      description: '3 activities: morning, afternoon, calming',
      icon: Calendar,
      enabled: true
    },
    {
      id: 'goals',
      title: 'Two goals',
      description: 'Communication and daily living skills',
      icon: Target,
      enabled: true
    },
    {
      id: 'calming',
      title: 'Calming supports',
      description: 'Quick sensory breaks when needed',
      icon: Heart,
      enabled: true
    }
  ]);

  const handleToggle = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ));
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-6 border-b border-gray-100">
        <h1 className="text-2xl font-semibold text-center text-slate-900">
          Your 7-day gentle start
        </h1>
        <p className="text-center text-muted-foreground mt-2">
          I've prepared these to help you get started. You can adjust anytime.
        </p>
      </div>

      {/* Approval Items */}
      <div className="flex-1 px-4 py-6 space-y-3 sm:space-y-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 sm:gap-4 p-4 border border-gray-200 rounded-lg"
            >
              <Switch
                checked={item.enabled}
                onCheckedChange={() => handleToggle(item.id)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="px-4 py-6 border-t border-gray-100 space-y-3">
        <Button
          onClick={() => onApprove(items)}
          className="w-full"
          size="lg"
        >
          Approve
        </Button>
        <Button
          onClick={onSimplify}
          variant="outline"
          className="w-full"
          size="lg"
        >
          Simplify
        </Button>
        <Button
          onClick={onNotNow}
          variant="ghost"
          className="w-full"
        >
          Not now
        </Button>
      </div>

      {/* Output Note */}
      <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
        <p className="text-xs text-center text-blue-700">
          Output: Diagnostic Prep Packet (not a diagnosis)
        </p>
      </div>
    </div>
  );
}
