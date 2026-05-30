// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  Users,
  BarChart3,
  Rocket,
  Shield,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface Phase2FeaturesMenuProps {
  onNavigate: (screen: string) => void;
  userRole?: 'parent' | 'coach' | 'admin';
  onBack?: () => void;
}

export function Phase2FeaturesMenu({ onNavigate, userRole = 'parent' }: Phase2FeaturesMenuProps) {
  const features = [
    {
      id: 'bcba-portal',
      title: 'BCBA Coach Portal',
      description: 'Manage families, track goals, and add clinical notes',
      icon: Users,
      badge: 'New',
      badgeColor: 'bg-green-100 text-green-700',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      visible: userRole === 'coach' || userRole === 'admin'
    },
    {
      id: 'analytics',
      title: 'Analytics Dashboard',
      description: 'Track engagement, AI usage, and outcomes',
      icon: BarChart3,
      badge: 'New',
      badgeColor: 'bg-green-100 text-green-700',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      visible: true
    },
    {
      id: 'launch-status',
      title: 'Launch Status',
      description: 'View beta readiness and Phase 2 completion',
      icon: Rocket,
      badge: 'Phase 2',
      badgeColor: 'bg-blue-100 text-blue-700',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      visible: userRole === 'admin'
    }
  ];

  const visibleFeatures = features.filter(f => f.visible);

  if (visibleFeatures.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-accent" />
        <h3 className="text-slate-900">New Features</h3>
        <Badge className="bg-accent/10 text-accent">Phase 2</Badge>
      </div>

      {visibleFeatures.map((feature) => {
        const Icon = feature.icon;
        return (
          <Card
            key={feature.id}
            className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-accent/30"
            onClick={() => onNavigate(feature.id)}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-slate-900">{feature.title}</h4>
                  <Badge className={feature.badgeColor}>{feature.badge}</Badge>
                </div>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
            </div>
          </Card>
        );
      })}

      {/* HIPAA Toggle Info Card */}
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-slate-900 mb-1">HIPAA-Conscious Privacy</h4>
            <p className="text-sm text-slate-700 mb-2">
              Enhanced privacy protections are now available in Settings → Privacy & Security
            </p>
            <button
              onClick={() => onNavigate('settings')}
              className="text-sm text-green-700 hover:text-green-800 underline underline-offset-2"
            >
              Configure privacy settings →
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
