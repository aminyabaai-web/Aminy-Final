import React from 'react';
import { Calendar, MessageCircle, Heart, Clock } from 'lucide-react';

interface TodayStripItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  duration: string;
  status?: 'upcoming' | 'current' | 'completed';
  onClick?: () => void;
}

interface TodayStripProps {
  items?: TodayStripItem[];
}

// Default items with exact copy from specification
const defaultTodayItems: TodayStripItem[] = [
  {
    id: '1',
    icon: Calendar,
    title: 'Morning routine',
    subtitle: '2 steps',
    duration: '6 min',
  },
  {
    id: '2',
    icon: MessageCircle,
    title: 'Ask for help',
    subtitle: '3 prompts',
    duration: '4 min',
  },
  {
    id: '3',
    icon: Heart,
    title: 'Calm Corner',
    subtitle: '60-sec reset',
    duration: '1 min',
  }
];

export function TodayStrip({ items = defaultTodayItems }: TodayStripProps) {
  // Display 2-4 items max as per spec
  const displayItems = items.slice(0, 4);

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-slate-700">Today</h3>
      </div>
      
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {displayItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`
                flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg
                border transition-all duration-200
                ${item.status === 'completed' 
                  ? 'bg-green-50 border-green-200 opacity-60' 
                  : item.status === 'current'
                  ? 'bg-accent/10 border-accent/30'
                  : 'bg-white border-gray-200 hover:border-accent/30'
                }
                min-h-[44px]
              `}
            >
              <Icon className="w-4 h-4 text-accent" />
              <div className="text-left">
                <p className="text-xs font-medium text-slate-700">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.subtitle} · {item.duration}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
