import React, { useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import {
  CheckCircle,
  Circle,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Users,
  Shield,
  BarChart3,
  Zap,
  Globe,
  FileText,
  Download
} from 'lucide-react';

interface LaunchStatusDashboardProps {
  onBack: () => void;
}

interface StatusItem {
  id: string;
  category: string;
  title: string;
  status: 'complete' | 'in-progress' | 'pending';
  completion: number;
  items: {
    name: string;
    done: boolean;
  }[];
}

export function LaunchStatusDashboard({ onBack }: LaunchStatusDashboardProps) {
  const [statusData] = useState<StatusItem[]>([
    {
      id: '1',
      category: 'Core Features',
      title: 'Parent & Child Modes',
      status: 'complete',
      completion: 100,
      items: [
        { name: 'Parent Dashboard', done: true },
        { name: 'Child (Junior) Mode', done: true },
        { name: 'AI Conversation Engine', done: true },
        { name: 'Care Plan Generator', done: true },
        { name: 'Goal Tracking', done: true }
      ]
    },
    {
      id: '2',
      category: 'AI Intelligence',
      title: 'Claude 3.5 Integration',
      status: 'complete',
      completion: 100,
      items: [
        { name: 'Updated to Claude 3.5 Sonnet 2024-10', done: true },
        { name: 'Persistent Memory Store', done: true },
        { name: 'Context-Aware Responses', done: true },
        { name: 'Emotional Intelligence', done: true },
        { name: 'Smart Cues & Nudges', done: true }
      ]
    },
    {
      id: '3',
      category: 'BCBA Features',
      title: 'Coach Portal',
      status: 'complete',
      completion: 100,
      items: [
        { name: 'Coach Dashboard', done: true },
        { name: 'Family Management', done: true },
        { name: 'Goal Tracking', done: true },
        { name: 'Clinical Notes', done: true },
        { name: 'AI Summary Cards', done: true }
      ]
    },
    {
      id: '4',
      category: 'Performance',
      title: 'Speed & Optimization',
      status: 'complete',
      completion: 100,
      items: [
        { name: 'CLS < 0.25ms Target', done: true },
        { name: 'Hardware Acceleration', done: true },
        { name: 'Lazy Loading', done: true },
        { name: 'Image Optimization', done: true },
        { name: 'Mobile Polish', done: true }
      ]
    },
    {
      id: '5',
      category: 'Compliance',
      title: 'HIPAA & Security',
      status: 'in-progress',
      completion: 80,
      items: [
        { name: 'HIPAA-Conscious Design', done: true },
        { name: 'Secure Data Storage', done: true },
        { name: 'Encryption Standards', done: true },
        { name: 'Compliance Documentation', done: false },
        { name: 'Privacy Policy Updates', done: true }
      ]
    },
    {
      id: '6',
      category: 'Monetization',
      title: 'Paywall & Tiers',
      status: 'complete',
      completion: 100,
      items: [
        { name: 'Free Tier', done: true },
        { name: 'Core (7-day trial)', done: true },
        { name: 'Plus (Premium)', done: true },
        { name: 'Payment Integration', done: true },
        { name: 'Trial Logic', done: true }
      ]
    },
    {
      id: '7',
      category: 'Launch Readiness',
      title: 'Beta Preparation',
      status: 'in-progress',
      completion: 90,
      items: [
        { name: 'All Modules Functional', done: true },
        { name: 'Mobile Responsive', done: true },
        { name: 'Error Handling', done: true },
        { name: 'Analytics Setup', done: true },
        { name: 'App Store Assets', done: false }
      ]
    }
  ]);

  const overallCompletion = Math.round(
    statusData.reduce((sum, item) => sum + item.completion, 0) / statusData.length
  );

  const completedModules = statusData.filter(item => item.status === 'complete').length;
  const inProgressModules = statusData.filter(item => item.status === 'in-progress').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in-progress':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <Circle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-700">Complete</Badge>;
      case 'in-progress':
        return <Badge className="bg-amber-100 text-amber-700">In Progress</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent/5 via-accent/8 to-accent/5 border-b border-accent/10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-slate-900 mb-2">Phase 2 Complete - Launch Status</h1>
              <p className="text-slate-600">Aminy Beta Readiness Dashboard</p>
            </div>
            <div className="text-right">
              <div className="text-3xl text-slate-900 mb-1">{overallCompletion}%</div>
              <div className="text-sm text-slate-600">Ready</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Overall Progress */}
        <Card className="p-6 mb-4 sm:mb-6 border-2 border-accent/20">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-accent" />
            <h2 className="text-slate-900">Overall Launch Readiness</h2>
          </div>
          <Progress value={overallCompletion} className="h-3 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-center">
            <div>
              <div className="text-2xl text-slate-900 mb-1">{completedModules}</div>
              <div className="text-sm text-slate-600">Completed</div>
            </div>
            <div>
              <div className="text-2xl text-slate-900 mb-1">{inProgressModules}</div>
              <div className="text-sm text-slate-600">In Progress</div>
            </div>
            <div>
              <div className="text-2xl text-slate-900 mb-1">{statusData.length}</div>
              <div className="text-sm text-slate-600">Total Modules</div>
            </div>
          </div>
        </Card>

        {/* Key Achievements */}
        <Card className="p-6 mb-4 sm:mb-6 bg-green-50 border-green-200">
          <h3 className="text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Phase 2 Achievements
          </h3>
          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-600" />
              <span className="text-slate-700">100% of core modules implemented</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-600" />
              <span className="text-slate-700">AI conversation engine with Claude 3.5 Sonnet</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-600" />
              <span className="text-slate-700">BCBA Coach Portal with family management</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-600" />
              <span className="text-slate-700">CLS performance optimizations (&lt; 0.25ms)</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-green-600" />
              <span className="text-slate-700">Mobile-responsive with Apple-clean design</span>
            </div>
          </div>
        </Card>

        {/* Detailed Status */}
        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
          <h2 className="text-slate-900">Module Status</h2>
          {statusData.map(item => (
            <Card key={item.id} className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <div className="text-xs text-slate-500 mb-1">{item.category}</div>
                    <h3 className="text-slate-900 mb-2">{item.title}</h3>
                    <Progress value={item.completion} className="h-2 w-48" />
                  </div>
                </div>
                {getStatusBadge(item.status)}
              </div>
              <div className="space-y-2 ml-8">
                {item.items.map((subItem, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {subItem.done ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300" />
                    )}
                    <span className={subItem.done ? 'text-slate-700' : 'text-slate-400'}>
                      {subItem.name}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Next Steps */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Remaining for Beta Launch
          </h3>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-blue-600" />
              <span className="text-slate-700">Complete HIPAA compliance documentation</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-blue-600" />
              <span className="text-slate-700">Generate App Store assets (5 screens + storyboard)</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-blue-600" />
              <span className="text-slate-700">Final QA testing across devices</span>
            </div>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export Launch Report
          </Button>
        </Card>
      </div>
    </div>
  );
}
