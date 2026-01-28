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
import type { InsightNavigator, ChildProfile, ConditionType } from '../lib/child-profiles';

interface InsightNavigatorReportProps {
  childId: string;
  childProfile?: ChildProfile;
  mode: 'parent' | 'provider';
  onShare?: () => void;
  onExport?: () => void;
}

export function InsightNavigatorReport({
  childId,
  childProfile,
  mode,
  onShare,
  onExport
}: InsightNavigatorReportProps) {
  const [navigator, setNavigator] = useState<InsightNavigator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'strategies' | 'providers'>('overview');

  useEffect(() => {
    loadNavigator();
  }, [childId]);

  const loadNavigator = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setNavigator(generateMockNavigator());
    setIsLoading(false);
  };

  const generateMockNavigator = (): InsightNavigator => ({
    id: `insight-${childId}`,
    childId,
    version: 12,
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: 'ai',

    executiveSummary: `Alex is a 6-year-old with Autism Spectrum Disorder (Level 1) and ADHD-Combined Type. He has made significant progress in morning routines (now 80% independent) and communication (using 3-word phrases consistently). Current focus areas include emotional regulation during transitions and evening routine consistency. Parents are highly engaged and consistently implement strategies. Alex responds well to visual supports, first-then language, and movement breaks.`,

    background: {
      familyContext: 'Two-parent household with older sibling (Emma, 9). Grandparents nearby and involved. Both parents work full-time with flexible schedules.',
      developmentalHistory: 'Born full-term, language delay noted at 18 months. Diagnosed ASD at age 4, ADHD at age 5. Started ABA at age 4.5 with good response.',
      medicalHistory: 'Takes Guanfacine 1mg daily for ADHD. Allergies: seasonal only. Sleep: improving with melatonin.',
      educationalHistory: 'Inclusive kindergarten with 1:1 aide. Has IEP with speech, OT, and behavioral goals.'
    },

    currentPresentation: {
      strengths: ['Strong visual learner', 'Excellent memory', 'Affectionate with family', 'Loves music', 'Good fine motor skills', 'Responds well to routine'],
      challenges: ['Emotional regulation during transitions', 'Evening routine resistance', 'Peer social interactions', 'New food acceptance'],
      interests: ['Dinosaurs', 'Trains', 'Building blocks', 'Music', 'Water play'],
      triggers: ['Unexpected changes', 'Loud environments', 'Being interrupted', 'Homework time'],
      calmingStrategies: ['Deep pressure', 'Movement breaks', 'Music', 'Quiet space', 'Dinosaur books'],
      communicationStyle: 'Verbal with 3-4 word phrases. Uses some AAC. Better expressive than receptive. Responds well to visual supports.',
      sensoryProfile: 'Seeks vestibular and proprioceptive input. Sensitive to loud sounds. Prefers dim lighting.'
    },

    insights: {
      whatsWorking: [
        { id: 'w1', content: 'Visual schedule for morning routine - 80% independence', source: 'provider', sourceDetail: 'BCBA', addedAt: '2024-03-15', category: 'Routine', priority: 'high' },
        { id: 'w2', content: 'First-Then board reduces transition tantrums', source: 'parent', addedAt: '2024-03-10', category: 'Transitions', priority: 'high' },
        { id: 'w3', content: 'Token economy motivating task completion', source: 'provider', addedAt: '2024-03-01', category: 'Motivation', priority: 'medium' }
      ],
      whatsNotWorking: [
        { id: 'n1', content: 'Evening routine too many steps', source: 'provider', addedAt: '2024-03-15', category: 'Routine', priority: 'high' },
        { id: 'n2', content: 'New food introduction causing refusal', source: 'parent', addedAt: '2024-03-14', category: 'Feeding', priority: 'medium' }
      ],
      opportunities: [
        { id: 'o1', content: 'Ready for peer play dates', source: 'provider', addedAt: '2024-03-15', category: 'Social', priority: 'high' },
        { id: 'o2', content: 'School willing to collaborate on IEP', source: 'parent', addedAt: '2024-03-12', category: 'School', priority: 'medium' }
      ],
      recommendations: [
        { id: 'r1', content: 'Simplify evening routine to 6-8 steps', source: 'provider', addedAt: '2024-03-15', category: 'Routine', priority: 'high' },
        { id: 'r2', content: 'Use food bridge strategy for new foods', source: 'provider', addedAt: '2024-03-15', category: 'Feeding', priority: 'medium' }
      ]
    },

    progressTimeline: [
      { id: 't1', date: '2024-03-15', area: 'Morning Routine', description: '80% independence - major milestone!', type: 'milestone', addedBy: 'BCBA' },
      { id: 't2', date: '2024-03-10', area: 'Communication', description: 'Using 3-word phrases consistently', type: 'milestone', addedBy: 'SLP' }
    ],

    providerQuickStart: {
      mustKnow: ['Use visual supports', 'Give 2-min warnings before transitions', 'Use dinosaurs as motivators', 'Keep language simple', 'Allow movement breaks'],
      approachGuidance: ['Start with preferred activity', 'Use First-Then language', 'Praise specific behaviors', 'Model calm voice'],
      avoidThese: ['Sudden changes without warning', 'Forcing eye contact', 'Time pressure', 'Taking away preferred items as punishment'],
      familyPreferences: ['Video off for first 5 min', 'Mom usually leads sessions', 'Prefer naturalistic teaching', 'Email summaries appreciated']
    },

    documentReferences: [
      { id: 'd1', type: 'evaluation', name: 'Developmental Evaluation', date: '2023-11-15', keyInsights: ['ASD Level 1', 'ADHD-Combined'] },
      { id: 'd2', type: 'iep', name: 'Current IEP', date: '2024-01-10', keyInsights: ['Speech 2x/week', 'OT 1x/week'] }
    ]
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-teal-500 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">Loading Profile</h3>
          <p className="text-sm text-gray-500">Preparing {childProfile?.firstName || 'child'}'s intake document...</p>
        </div>
      </div>
    );
  }

  if (!navigator) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-teal-600 to-cyan-600 text-white border-0">
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
            {onShare && (
              <Button variant="outline" size="sm" onClick={onShare} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            )}
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
            <FileText className="w-5 h-5 text-teal-600" />
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

          <Card className="p-4 bg-teal-50 border-teal-200">
            <h3 className="font-medium text-teal-700 mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4" />What Helps Calm Down
            </h3>
            <div className="flex flex-wrap gap-2">
              {navigator.currentPresentation.calmingStrategies.map((item, idx) => (
                <Badge key={idx} variant="outline" className="bg-white border-teal-300 text-teal-700">{item}</Badge>
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

          <Card className="p-4 bg-teal-50 border-teal-200">
            <h3 className="font-medium text-teal-700 mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />Recommendations
            </h3>
            <div className="space-y-2">
              {navigator.insights.recommendations.map((item) => (
                <div key={item.id} className="p-3 bg-white rounded-lg border border-teal-200">
                  <p className="text-sm text-gray-800">{item.content}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                    <Badge className={`text-xs ${item.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
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
      <Card className="p-4 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span>HIPAA-compliant • Encrypted • Parent-controlled</span>
          </div>
          <span>Updated: {new Date(navigator.lastUpdated).toLocaleString()}</span>
        </div>
      </Card>
    </div>
  );
}
