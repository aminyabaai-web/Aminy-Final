import React from 'react';
import { 
  FileText, 
  Shield, 
  Smartphone, 
  ChevronRight, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface ConnectorCard {
  id: string;
  type: 'insight' | 'benefits' | 'device';
  title: string;
  description: string;
  status: 'incomplete' | 'pending' | 'action-needed';
  actionLabel: string;
  onAction: () => void;
}

interface ActionableConnectorCardsProps {
  cards: ConnectorCard[];
}

const cardIcons = {
  insight: FileText,
  benefits: Shield,
  device: Smartphone
};

const statusConfig = {
  incomplete: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    icon: AlertCircle,
    iconColor: 'text-amber-600'
  },
  pending: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    icon: Clock,
    iconColor: 'text-blue-600'
  },
  'action-needed': {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    icon: AlertCircle,
    iconColor: 'text-red-600'
  }
};

export function ActionableConnectorCards({ cards }: ActionableConnectorCardsProps) {
  if (!cards || cards.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {cards.map((card) => {
        const Icon = cardIcons[card.type];
        const config = statusConfig[card.status];
        const StatusIcon = config.icon;

        return (
          <Card
            key={card.id}
            onClick={card.onAction}
            className={`p-4 cursor-pointer hover:shadow-md transition-all ${config.bg} ${config.border} border-2`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Icon className="w-5 h-5 text-slate-700" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900">{card.title}</h3>
                  <StatusIcon className={`w-4 h-4 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                </div>

                <p className="text-sm text-slate-600 mb-3">{card.description}</p>

                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className={`text-xs ${config.badge}`}>
                    {card.status === 'incomplete' && 'Incomplete'}
                    {card.status === 'pending' && 'Pending'}
                    {card.status === 'action-needed' && 'Action needed'}
                  </Badge>

                  <div className="flex items-center gap-1 text-sm font-medium text-accent">
                    <span>{card.actionLabel}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
