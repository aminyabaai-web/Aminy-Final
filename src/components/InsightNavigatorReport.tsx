// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * InsightNavigatorReport.tsx
 *
 * The Living Intake Document - A comprehensive, AI-updated profile
 * that serves as the data-rich intake for marketplace providers.
 *
 * This is different from InsightNavigator.tsx which shows analytics.
 * This component is the comprehensive child profile that providers use
 * so they don't start from zero in telehealth sessions.
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  FileText, Sparkles, Brain, Heart, Target, CheckCircle,
  AlertTriangle, Lightbulb, TrendingUp, Clock, User, Users,
  Calendar, Star, ChevronRight, Download, Share2, Lock, Unlock,
  RefreshCw, BookOpen, MessageSquare, Shield, Zap, Hand
} from 'lucide-react';
import { createEmptyInsightNavigator } from '../lib/child-profiles';
import type { InsightNavigator, ChildProfile, ConditionType } from '../lib/child-profiles';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

interface InsightNavigatorReportProps {
  childId: string;
  childProfile?: ChildProfile;
  mode: 'parent' | 'provider';
  onShare?: () => void;
  onExport?: () => void;
  /** Optional CTA from the empty state. Falls back to the global nav hook, then a toast. */
  onStartLogging?: () => void;
}

export function InsightNavigatorReport({
  childId,
  childProfile,
  mode,
  onShare,
  onExport,
  onStartLogging
}: InsightNavigatorReportProps) {
  const [navigator, setNavigator] = useState<InsightNavigator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'strategies' | 'providers'>('overview');

  useEffect(() => {
    loadNavigator();
  }, [childId]);

  const loadNavigator = async () => {
    setIsLoading(true);
    try {
      // Try to load stored InsightNavigator from Supabase
      const { data: stored } = await supabase
        .from('insight_navigators')
        .select('*')
        .eq('child_id', childId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (stored) {
        setNavigator(stored as InsightNavigator);
      } else {
        // No stored navigator — start with empty scaffold from child profile data
        const empty = createEmptyInsightNavigator(childId);
        if (childProfile) {
          const cp = childProfile as ChildProfile & { strengths?: string[]; challenges?: string[]; interests?: string[]; triggers?: string[]; calmingStrategies?: string[] };
          empty.currentPresentation.strengths = cp.strengths || [];
          empty.currentPresentation.challenges = cp.challenges || [];
          empty.currentPresentation.interests = cp.interests || [];
          empty.currentPresentation.triggers = cp.triggers || [];
          empty.currentPresentation.calmingStrategies = cp.calmingStrategies || [];
        }
        setNavigator(empty);
      }
    } catch {
      setNavigator(createEmptyInsightNavigator(childId));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">Loading Profile</h3>
          <p className="text-sm text-gray-500">Preparing {childProfile?.firstName || 'child'}'s intake document...</p>
        </div>
      </div>
    );
  }

  if (!navigator) return null;

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      toast.info('Sharing this profile with a provider is coming soon.');
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      toast.info('PDF export is coming soon.');
    }
  };

  // An untouched profile has no executive summary, no insights, and no
  // current-presentation detail. Showing the full chromed report in that
  // case looks broken/half-loaded, so render an honest onboarding state.
  const cp = navigator.currentPresentation;
  const ins = navigator.insights;
  const hasContent =
    navigator.executiveSummary.trim().length > 0 ||
    cp.strengths.length > 0 ||
    cp.challenges.length > 0 ||
    cp.interests.length > 0 ||
    cp.calmingStrategies.length > 0 ||
    cp.communicationStyle.trim().length > 0 ||
    cp.sensoryProfile.trim().length > 0 ||
    ins.whatsWorking.length > 0 ||
    ins.whatsNotWorking.length > 0 ||
    ins.recommendations.length > 0 ||
    navigator.progressTimeline.length > 0;

  if (!hasContent) {
    return (
      <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 sm:space-y-6">
        <Card className="p-6 bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] text-white border-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold">Insight Navigator</h1>
                <Badge className="bg-white/20 text-white border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Living Intake Document
                </Badge>
              </div>
              <p className="text-teal-100">
                {childProfile?.firstName || 'Your child'}'s Profile
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#6B9080]/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-[#6B9080]" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {childProfile?.firstName ? `${childProfile.firstName}'s` : "Your child's"} Insight Navigator builds as you use Aminy
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            As you log behaviors, track what helps, and chat with Aminy AI, we
            assemble a living intake document — strengths, challenges, calming
            strategies, and a provider-ready summary. There's nothing to show
            yet, but it fills in automatically over time.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                if (onStartLogging) {
                  onStartLogging();
                } else if (typeof window !== 'undefined' && window.__navigateToScreen) {
                  window.__navigateToScreen('log-behavior');
                } else {
                  toast.info('Log a behavior or chat with Aminy AI to start building this profile.');
                }
              }}
              className="bg-primary text-white hover:bg-[#6B9080]"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start logging
            </Button>
          </div>
        </Card>

        <Card className="p-4 bg-[#FAF7F2]">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shield className="w-4 h-4 text-green-500" />
            <span>HIPAA-conscious • Encrypted • Parent-controlled</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] text-white border-0">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold">Insight Navigator</h1>
                <Badge className="bg-white/20 text-white border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Living Intake Document
                </Badge>
              </div>
              <p className="text-teal-100">
                {childProfile?.firstName || 'Child'}'s Profile • v{navigator.version}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-sm text-teal-100">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Updated {new Date(navigator.lastUpdated).toLocaleDateString()}
          </span>
          {mode === 'provider' && (
            <Badge className="bg-green-500/20 text-green-100 border-0">
              <Unlock className="w-3 h-3 mr-1" />
              Full Access
            </Badge>
          )}
        </div>
      </Card>

      {/* Provider Quick Start */}
      {mode === 'provider' && (
        <Card className="p-6 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-600" />
            Provider Quick Start
          </h2>
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
            <div>
              <h3 className="text-sm font-medium text-violet-700 mb-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Must Know
              </h3>
              <ul className="space-y-1.5">
                {navigator.providerQuickStart.mustKnow.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-violet-500 mt-1">•</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Avoid These
              </h3>
              <ul className="space-y-1.5">
                {navigator.providerQuickStart.avoidThese.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Executive Summary */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#6B9080]" />
            Executive Summary
          </h2>
          <Badge variant="outline" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />AI-Generated
          </Badge>
        </div>
        <p className="text-gray-700 leading-relaxed">{navigator.executiveSummary}</p>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Current</TabsTrigger>
          <TabsTrigger value="history">Background</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="providers">For Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 sm:space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4">
              <h3 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4" />Strengths
              </h3>
              <ul className="space-y-2">
                {navigator.currentPresentation.strengths.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-3 sm:p-4">
              <h3 className="font-medium text-amber-700 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />Challenges
              </h3>
              <ul className="space-y-2">
                {navigator.currentPresentation.challenges.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-blue-700 mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4" />Interests & Motivators
            </h3>
            <div className="flex flex-wrap gap-2">
              {navigator.currentPresentation.interests.map((item, idx) => (
                <Badge key={idx} className="bg-blue-100 text-blue-700">{item}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-4 bg-[#6B9080]/10 border-[#6B9080]/20">
            <h3 className="font-medium text-[#6B9080] mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4" />What Helps Calm Down
            </h3>
            <div className="flex flex-wrap gap-2">
              {navigator.currentPresentation.calmingStrategies.map((item, idx) => (
                <Badge key={idx} variant="outline" className="bg-white border-[#6B9080]/30 text-[#6B9080]">{item}</Badge>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-3 sm:space-y-4 mt-4">
          {Object.entries(navigator.background).map(([key, value]) => (
            <Card key={key} className="p-3 sm:p-4">
              <h3 className="font-medium text-gray-900 mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1')}</h3>
              <p className="text-sm text-gray-700">{value}</p>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="strategies" className="space-y-3 sm:space-y-4 mt-4">
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-green-700 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />What's Working
            </h3>
            <div className="space-y-2">
              {navigator.insights.whatsWorking.map((item) => (
                <div key={item.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-800">{item.content}</p>
                  <Badge variant="outline" className="mt-2 text-xs">{item.category}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-amber-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />What's Not Working
            </h3>
            <div className="space-y-2">
              {navigator.insights.whatsNotWorking.map((item) => (
                <div key={item.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-gray-800">{item.content}</p>
                  <Badge variant="outline" className="mt-2 text-xs">{item.category}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 bg-[#6B9080]/10 border-[#6B9080]/20">
            <h3 className="font-medium text-[#6B9080] mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />Recommendations
            </h3>
            <div className="space-y-2">
              {navigator.insights.recommendations.map((item) => (
                <div key={item.id} className="p-3 bg-white rounded-lg border border-[#6B9080]/20">
                  <p className="text-sm text-gray-800">{item.content}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                    <Badge className={`text-xs ${item.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-[#F0EDE8] text-gray-700'}`}>
                      {item.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-3 sm:space-y-4 mt-4">
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />Communication Style
            </h3>
            <p className="text-sm text-gray-700">{navigator.currentPresentation.communicationStyle}</p>
          </Card>

          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Hand className="w-4 h-4" />Sensory Profile
            </h3>
            <p className="text-sm text-gray-700">{navigator.currentPresentation.sensoryProfile}</p>
          </Card>

          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-violet-700 mb-3">Approach Guidance</h3>
            <ul className="space-y-2">
              {navigator.providerQuickStart.approachGuidance.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-violet-500 mt-0.5" />{item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-pink-700 mb-3">Family Preferences</h3>
            <ul className="space-y-2">
              {navigator.providerQuickStart.familyPreferences.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <Star className="w-4 h-4 text-pink-500 mt-0.5" />{item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />Recent Progress
            </h3>
            <div className="space-y-3">
              {navigator.progressTimeline.map((entry) => (
                <div key={entry.id} className="flex gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${entry.type === 'milestone' ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">{entry.area}</span>
                      <Badge variant="outline" className="text-xs">{entry.type}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{entry.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(entry.date).toLocaleDateString()} • {entry.addedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Card className="p-4 bg-[#FAF7F2]">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span>HIPAA-conscious • Encrypted • Parent-controlled</span>
          </div>
          <span>Updated: {new Date(navigator.lastUpdated).toLocaleString()}</span>
        </div>
      </Card>
    </div>
  );
}
