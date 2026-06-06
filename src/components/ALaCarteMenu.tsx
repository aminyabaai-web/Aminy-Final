// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  Clock,
  User,
  GraduationCap,
  Video,
  Check,
  Star,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ALaCarteMenuProps {
  onBookSession?: (sessionType: string, duration: number) => void;
  userTier?: string;
  isProUser?: boolean;
}

export function ALaCarteMenu({ onBookSession, userTier = 'free', isProUser = false }: ALaCarteMenuProps) {
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Cash-pay session pricing (aligned with pricing.ts source of truth)
  // Tier discounts: Free=0%, Core=10%, Pro=20%
  const sessions = [
    {
      id: 'rbt-30',
      type: 'RBT',
      title: 'ABA Coaching Session',
      duration: 30,
      price: 49,
      proPrice: 39, // 20% discount for Pro
      description: 'Skill-building session with a trained behavior technician focused on daily strategies and routine building.',
      bestFor: 'Daily skill practice, routine building, play-based learning',
      icon: User,
      color: 'bg-blue-100 text-blue-700',
      popular: false
    },
    {
      id: 'rbt-60',
      type: 'RBT',
      title: 'ABA Extended Coaching',
      duration: 60,
      price: 89,
      proPrice: 71,
      description: 'Extended coaching session for deeper work on specific skills or challenging situations.',
      bestFor: 'Complex skill building, intensive parent training',
      icon: User,
      color: 'bg-blue-100 text-blue-700',
      popular: false
    },
    {
      id: 'bcba-30',
      type: 'BCBA',
      title: 'BCBA Quick Check-In',
      duration: 30,
      price: 79,
      proPrice: 63,
      description: 'Brief consultation for specific questions or follow-ups with a Board Certified Behavior Analyst.',
      bestFor: 'Quick questions, follow-ups, progress check-ins',
      icon: GraduationCap,
      color: 'bg-[#6B9080]/10 text-[#6B9080]',
      popular: false
    },
    {
      id: 'bcba-60',
      type: 'BCBA',
      title: 'BCBA Consultation',
      duration: 60,
      price: 149,
      proPrice: 119,
      description: 'Expert consultation with a Board Certified Behavior Analyst to review progress and adjust strategies.',
      bestFor: 'Care plan review, strategy adjustments, goal setting',
      icon: GraduationCap,
      color: 'bg-[#6B9080]/10 text-[#6B9080]',
      popular: true
    },
    {
      id: 'bcba-90',
      type: 'BCBA',
      title: 'Comprehensive Assessment',
      duration: 90,
      price: 219,
      proPrice: 175,
      description: 'In-depth evaluation to create a personalized behavior support plan for complex cases.',
      bestFor: 'Behavior challenges, school meetings, complex situations',
      icon: Sparkles,
      color: 'bg-violet-100 text-violet-700',
      popular: false
    }
  ];

  const handleBookSession = (session: typeof sessions[0]) => {
    if (onBookSession) {
      onBookSession(session.id, session.duration);
    } else {
      toast.success('Session selected!', {
        description: `${session.title} (${session.duration} min) - $${isProUser ? session.proPrice : session.price}`,
        action: {
          label: 'Continue',
          onClick: () => {},
        }
      });
    }
    setSelectedService(session.id);
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733] mb-2">Book a Session</h2>
        <p className="text-[#5A6B7A] text-sm max-w-md mx-auto">
          Cash-pay telehealth sessions with verified behavioral health experts.
          All sessions include a summary added to your care plan.
        </p>
        {isProUser && (
          <Badge className="mt-3 bg-violet-100 text-violet-700">
            Pro Member: 20% off all sessions
          </Badge>
        )}
      </div>

      {/* Session Cards */}
      <div className="space-y-3 sm:space-y-4">
        {sessions.map((session) => {
          const IconComponent = session.icon;
          const displayPrice = isProUser ? session.proPrice : session.price;
          const isSelected = selectedService === session.id;

          return (
            <Card
              key={session.id}
              className={`p-4 transition-all cursor-pointer hover:shadow-md ${
                isSelected ? 'ring-2 ring-teal-500' : ''
              } ${session.popular ? 'border-[#6B9080]/20 bg-[#6B9080]/10/30' : ''}`}
              onClick={() => handleBookSession(session)}
            >
              {session.popular && (
                <Badge className="mb-3 bg-primary text-white">
                  <Star className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              )}

              <div className="flex items-start gap-3 sm:gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${session.color} flex-shrink-0`}>
                  <IconComponent className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="font-semibold text-[#1B2733]">{session.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
                        <Clock className="w-3 h-3" />
                        <span>{session.duration} minutes</span>
                        <span className="mx-1">•</span>
                        <Video className="w-3 h-3" />
                        <span>Telehealth</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-[#1B2733]">
                        ${displayPrice}
                      </div>
                      {isProUser && (
                        <div className="text-xs text-[#8A9BA8] line-through">
                          ${session.price}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-[#5A6B7A] mb-2">
                    {session.description}
                  </p>

                  <div className="flex items-center gap-1 text-xs text-[#5A6B7A]">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>Best for: {session.bestFor}</span>
                  </div>
                </div>
              </div>

              {/* Book Button */}
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  className={session.popular ? 'bg-primary hover:bg-[#6B9080]' : ''}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookSession(session);
                  }}
                >
                  Book Now
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Trust Badge */}
      <div className="text-center pt-4 border-t border-[#E8E4DF]">
        <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs text-[#5A6B7A]">
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-green-500" />
            BHCOE Accredited
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-green-500" />
            Licensed in Arizona
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-green-500" />
            Session notes in 24hrs
          </span>
        </div>
      </div>

      {/* Legal Disclaimers */}
      <div className="text-xs text-[#8A9BA8] text-center space-y-2 pt-2">
        <p>
          Cash-pay sessions are parent coaching and wellness support, not medical treatment or therapy.
          Sessions are conducted by independently licensed providers via encrypted, secure video.
        </p>
        <p>
          By booking, you agree to our <button className="underline hover:text-[#5A6B7A]">Terms of Service</button> and <button className="underline hover:text-[#5A6B7A]">Telehealth Consent</button>.
          Prepaid sessions never expire. Cancellations require 24-hour notice for full refund.
        </p>
        <p className="text-[#8A9BA8]">
          Aminy facilitates connections with providers but is not the provider of clinical services.
          Providers are independently licensed professionals responsible for their own clinical decisions.
        </p>
      </div>
    </div>
  );
}
