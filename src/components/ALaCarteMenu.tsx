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

  // Cash-pay session pricing (aligned with AACT Arizona rates)
  const sessions = [
    {
      id: 'rbt-30',
      type: 'RBT',
      title: 'RBT Parent Coaching',
      duration: 30,
      price: 75,
      proPrice: 60, // 20% discount for Pro
      description: 'One-on-one session with a Registered Behavior Technician focused on daily strategies and routine building.',
      bestFor: 'Daily skill practice, routine building, play-based learning',
      icon: User,
      color: 'bg-blue-100 text-blue-700',
      popular: false
    },
    {
      id: 'rbt-45',
      type: 'RBT',
      title: 'RBT Extended Session',
      duration: 45,
      price: 100,
      proPrice: 80,
      description: 'Extended coaching session for deeper work on specific skills or challenging situations.',
      bestFor: 'Complex skill building, intensive parent training',
      icon: User,
      color: 'bg-blue-100 text-blue-700',
      popular: false
    },
    {
      id: 'bcba-30',
      type: 'BCBA',
      title: 'BCBA Consultation',
      duration: 30,
      price: 150,
      proPrice: 120,
      description: 'Expert consultation with a Board Certified Behavior Analyst to review progress and adjust strategies.',
      bestFor: 'Care plan review, strategy adjustments, goal setting',
      icon: GraduationCap,
      color: 'bg-teal-100 text-teal-700',
      popular: true
    },
    {
      id: 'bcba-45',
      type: 'BCBA',
      title: 'BCBA Deep Dive',
      duration: 45,
      price: 175,
      proPrice: 140,
      description: 'Comprehensive session for behavior assessment, crisis planning, or IEP/school consultation prep.',
      bestFor: 'Behavior challenges, school meetings, complex situations',
      icon: GraduationCap,
      color: 'bg-teal-100 text-teal-700',
      popular: false
    },
    {
      id: 'bcba-d-45',
      type: 'BCBA-D',
      title: 'Clinical Director Session',
      duration: 45,
      price: 200,
      proPrice: 160,
      description: 'Premium consultation with our Clinical Director for the most complex cases and comprehensive evaluations.',
      bestFor: 'Complex diagnoses, multi-disciplinary coordination, second opinions',
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
        }
      });
    }
    setSelectedService(session.id);
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Book a Session</h2>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
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
              } ${session.popular ? 'border-teal-200 bg-teal-50/30' : ''}`}
              onClick={() => handleBookSession(session)}
            >
              {session.popular && (
                <Badge className="mb-3 bg-teal-500 text-white">
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
                      <h3 className="font-semibold text-gray-900">{session.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{session.duration} minutes</span>
                        <span className="mx-1">•</span>
                        <Video className="w-3 h-3" />
                        <span>Telehealth</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        ${displayPrice}
                      </div>
                      {isProUser && (
                        <div className="text-xs text-gray-400 line-through">
                          ${session.price}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {session.description}
                  </p>

                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>Best for: {session.bestFor}</span>
                  </div>
                </div>
              </div>

              {/* Book Button */}
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  className={session.popular ? 'bg-teal-600 hover:bg-teal-700' : ''}
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
      <div className="text-center pt-4 border-t border-gray-100">
        <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs text-gray-500">
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
      <div className="text-xs text-gray-400 text-center space-y-2 pt-2">
        <p>
          Cash-pay sessions are parent coaching and wellness support, not medical treatment or therapy.
          Sessions are conducted by independently licensed providers via HIPAA-compliant secure video.
        </p>
        <p>
          By booking, you agree to our <button className="underline hover:text-gray-600">Terms of Service</button> and <button className="underline hover:text-gray-600">Telehealth Consent</button>.
          Prepaid sessions never expire. Cancellations require 24-hour notice for full refund.
        </p>
        <p className="text-gray-300">
          Aminy facilitates connections with providers but is not the provider of clinical services.
          Providers are independently licensed professionals responsible for their own clinical decisions.
        </p>
      </div>
    </div>
  );
}
