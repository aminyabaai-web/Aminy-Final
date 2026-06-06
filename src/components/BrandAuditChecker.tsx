// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Check, 
  X, 
  AlertTriangle, 
  Eye, 
  Sparkles,
  FileText,
  Download
} from 'lucide-react';

interface AuditResult {
  screen: string;
  hasAIPresence: boolean;
  hasABAReference: boolean;
  hasProhibitedWords: string[];
  hasAIGradient: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}

export function BrandAuditChecker() {
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  // Prohibited words that should never appear in user-facing copy
  const prohibitedWords = [
    'therapy', 
    'treatment', 
    'patient', 
    'diagnosis', 
    'disorder', 
    'cure', 
    'fix', 
    'broken',
    'clinical therapy',
    'medical device',
    'intervention',
    'prescription'
  ];

  // Required elements for brand compliance
  const requiredAITerms = [
    'AI',
    'adaptive',
    'personalized',
    'smart guidance',
    'intelligent'
  ];

  const requiredABATerms = [
    'ABA',
    'Applied Behavior Analysis',
    'behavioral science',
    'behavioral wellness'
  ];

  // Simulated audit function (in production, this would scan actual DOM)
  const performAudit = () => {
    setIsScanning(true);

    // Simulate scanning delay
    setTimeout(() => {
      const mockResults: AuditResult[] = [
        {
          screen: 'Splash Screen',
          hasAIPresence: true,
          hasABAReference: true,
          hasProhibitedWords: [],
          hasAIGradient: true,
          score: 100,
          issues: [],
          recommendations: ['Perfect! All brand elements present.']
        },
        {
          screen: 'Dashboard',
          hasAIPresence: true,
          hasABAReference: true,
          hasProhibitedWords: [],
          hasAIGradient: true,
          score: 100,
          issues: [],
          recommendations: ['Excellent implementation of "Today\'s Calm Plan"']
        },
        {
          screen: 'Onboarding Flow',
          hasAIPresence: true,
          hasABAReference: true,
          hasProhibitedWords: [],
          hasAIGradient: false,
          score: 90,
          issues: ['Missing AI gradient glow on welcome card'],
          recommendations: ['Add subtle AI gradient to welcome message background']
        },
        {
          screen: 'Reports Hub',
          hasAIPresence: true,
          hasABAReference: true,
          hasProhibitedWords: [],
          hasAIGradient: false,
          score: 95,
          issues: [],
          recommendations: ['Consider adding Professional View tab as planned']
        },
        {
          screen: 'Pricing Page',
          hasAIPresence: true,
          hasABAReference: true,
          hasProhibitedWords: [],
          hasAIGradient: true,
          score: 100,
          issues: [],
          recommendations: ['Excellent tier differentiation with AI gradients']
        },
        {
          screen: 'Settings',
          hasAIPresence: false,
          hasABAReference: false,
          hasProhibitedWords: [],
          hasAIGradient: false,
          score: 70,
          issues: ['No AI or ABA reference in section headers'],
          recommendations: [
            'Add "Powered by AI" badge to Settings header',
            'Include ABA disclaimer in Legal section'
          ]
        }
      ];

      setAuditResults(mockResults);
      
      // Calculate overall score
      const avgScore = mockResults.reduce((sum, r) => sum + r.score, 0) / mockResults.length;
      setOverallScore(Math.round(avgScore));
      
      setIsScanning(false);
    }, 2000);
  };

  useEffect(() => {
    performAudit();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 95) return 'bg-green-500';
    if (score >= 85) return 'bg-blue-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-accent to-teal-500 rounded-full flex items-center justify-center">
              <Eye className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-semibold text-[#1B2733] mb-4">
            Brand Audit Report
          </h1>
          
          <p className="text-lg text-[#5A6B7A] max-w-2xl mx-auto">
            Automated check for ABA-based behavioral wellness brand compliance
          </p>
        </div>

        {/* Overall Score */}
        <Card className="p-8 mb-8 bg-gradient-to-r from-accent/5 to-teal-50 border-accent/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 sm:gap-6">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-semibold text-[#1B2733] mb-2">Overall Brand Score</h2>
              <p className="text-[#5A6B7A]">Compliance with ABA wellness framework</p>
            </div>
            
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(overallScore)} mb-2`}>
                {isScanning ? '...' : `${overallScore}%`}
              </div>
              <Badge className={getScoreBadge(overallScore)}>
                {overallScore >= 95 ? 'Excellent' : overallScore >= 85 ? 'Good' : overallScore >= 70 ? 'Needs Work' : 'Critical'}
              </Badge>
            </div>

            <div className="w-full md:w-64">
              <Progress value={overallScore} className="h-3" />
              <p className="text-xs text-[#5A6B7A] mt-2 text-center">
                {auditResults.length} screens audited
              </p>
            </div>
          </div>
        </Card>

        {/* Audit Criteria */}
        <Card className="p-6 mb-8">
          <h3 className="font-semibold text-[#1B2733] mb-4">Audit Criteria</h3>
          <div className="grid md:grid-cols-4 gap-3 sm:gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-[#1B2733]">AI Presence</p>
                <p className="text-[#5A6B7A] text-xs">Visual or copy reference to AI</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-[#1B2733]">ABA Reference</p>
                <p className="text-[#5A6B7A] text-xs">Educational/proof mention</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-[#1B2733]">No Prohibited Words</p>
                <p className="text-[#5A6B7A] text-xs">Therapy, patient, disorder, etc.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Eye className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-[#1B2733]">AI Gradient Glow</p>
                <p className="text-[#5A6B7A] text-xs">Visual brand consistency</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Individual Screen Results */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-2xl font-semibold text-[#1B2733] mb-4">Screen-by-Screen Analysis</h2>
          
          {auditResults.map((result, index) => (
            <Card key={index} className="p-4 sm:p-5 md:p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-[#1B2733]">{result.screen}</h3>
                    <Badge className={getScoreBadge(result.score)}>
                      {result.score}%
                    </Badge>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {result.hasAIPresence ? (
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI ✓
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <X className="w-3 h-3 mr-1" />
                      No AI
                    </Badge>
                  )}
                  
                  {result.hasABAReference ? (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                      <FileText className="w-3 h-3 mr-1" />
                      ABA ✓
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <X className="w-3 h-3 mr-1" />
                      No ABA
                    </Badge>
                  )}
                  
                  {result.hasAIGradient ? (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                      <Eye className="w-3 h-3 mr-1" />
                      Gradient ✓
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Eye className="w-3 h-3 mr-1" />
                      No Glow
                    </Badge>
                  )}
                </div>
              </div>

              {/* Issues */}
              {result.issues.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Issues Found
                  </h4>
                  <ul className="space-y-1">
                    {result.issues.map((issue, i) => (
                      <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prohibited Words */}
              {result.hasProhibitedWords.length > 0 && (
                <div className="mb-4 bg-red-50 rounded-lg p-3 border border-red-200">
                  <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Prohibited Words Detected
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.hasProhibitedWords.map((word, i) => (
                      <Badge key={i} variant="destructive">{word}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[#1B2733] mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-[#3A4A57] flex items-start gap-2">
                        <span className="text-green-500">→</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-3 sm:gap-4 justify-center">
          <Button 
            onClick={performAudit}
            className="bg-accent hover:bg-accent/90 gap-2"
            disabled={isScanning}
          >
            <Eye className="w-4 h-4" />
            {isScanning ? 'Scanning...' : 'Re-run Audit'}
          </Button>
          
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        {/* Summary */}
        <Card className="mt-8 p-6 bg-[#FAF7F2]">
          <h3 className="font-semibold text-[#1B2733] mb-3">Audit Summary</h3>
          <div className="grid md:grid-cols-3 gap-3 sm:gap-4 text-sm">
            <div>
              <p className="text-[#5A6B7A] mb-1">Screens Passing</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {auditResults.filter(r => r.score >= 90).length} / {auditResults.length}
              </p>
            </div>
            <div>
              <p className="text-[#5A6B7A] mb-1">Total Issues</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-600">
                {auditResults.reduce((sum, r) => sum + r.issues.length, 0)}
              </p>
            </div>
            <div>
              <p className="text-[#5A6B7A] mb-1">Compliance Rate</p>
              <p className="text-xl sm:text-2xl font-bold text-accent">
                {overallScore}%
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
