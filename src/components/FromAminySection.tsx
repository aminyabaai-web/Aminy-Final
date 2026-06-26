// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { FileText, Lightbulb, CheckCircle, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface FromAminyCard {
  id: string;
  headline: string;
  subtext: string;
  cta: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

export function FromAminySection() {
  const cards: FromAminyCard[] = [
    {
      id: '1',
      headline: '5 bedtime streak days — amazing',
      subtext: 'Want a visual schedule card for the next week?',
      cta: 'Get schedule card',
      icon: CheckCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      id: '2',
      headline: 'Sleep regression at 4?',
      subtext: 'Short answer: Yes. Longer: Here\'s why + what helps...',
      cta: 'Read 2-min guide',
      icon: FileText,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: '3',
      headline: 'AAC myths busted',
      subtext: 'It won\'t slow speech—it unlocks it. Here\'s the research.',
      cta: 'See evidence',
      icon: CheckCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      id: '4',
      headline: 'IEP meeting this week?',
      subtext: 'Print this 1-pager so you don\'t forget your asks.',
      cta: 'Get checklist',
      icon: Lightbulb,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600'
    }
  ];

  const handleCardClick = (id: string) => {
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold">From Aminy</h3>
      </div>

      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card 
            key={card.id} 
            className="p-4 hover:shadow-md transition-all cursor-pointer group"
            onClick={() => handleCardClick(card.id)}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className={`p-2 ${card.iconBg} rounded-lg flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-[#132F43] mb-1">{card.headline}</h4>
                <p className="text-sm text-[#5A6B7A] mb-3">{card.subtext}</p>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-accent hover:text-accent/90 p-0 h-auto font-medium group-hover:translate-x-1 transition-transform"
                >
                  {card.cta}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
