// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Heart, Shield, Target, Sparkles, Brain, Zap } from 'lucide-react';
import { BRAND_IDENTITY, POSITIONING_STATEMENT, VALUE_PILLARS, LEGAL_PRIVACY } from '../lib/brand-guide';

interface AboutAminyProps {
  variant?: 'full' | 'compact';
  showLegal?: boolean;
}

export function AboutAminy({ variant = 'full', showLegal = true }: AboutAminyProps) {
  if (variant === 'compact') {
    return (
      <Card className="p-6 bg-gradient-to-br from-accent/5 to-teal-50 dark:from-slate-800 dark:to-slate-700">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1B2733] dark:text-white mb-1">About {BRAND_IDENTITY.name}</h3>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 leading-relaxed">
                <strong>Category:</strong> {BRAND_IDENTITY.category}<br />
                <strong>Subcategory:</strong> {BRAND_IDENTITY.subcategory}
              </p>
            </div>
          </div>

          <p className="text-sm text-[#3A4A57] dark:text-slate-300 leading-relaxed">
            {POSITIONING_STATEMENT}
          </p>

          {showLegal && (
            <div className="pt-3 border-t border-[#E8E4DF] dark:border-slate-600">
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 italic">
                {LEGAL_PRIVACY.disclaimer}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center pb-6 border-b border-[#E8E4DF] dark:border-slate-700">
        <h1 className="text-3xl font-semibold text-[#1B2733] dark:text-white mb-3">About {BRAND_IDENTITY.name}</h1>
        <p className="text-lg text-[#5A6B7A] dark:text-slate-400 max-w-2xl mx-auto">
          {BRAND_IDENTITY.tagline}
        </p>
      </div>

      {/* Positioning Statement */}
      <Card className="p-6 bg-gradient-to-br from-accent/5 to-teal-50 dark:from-slate-800 dark:to-slate-700 border-accent/20">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733] dark:text-white mb-3">What is {BRAND_IDENTITY.name}?</h2>
            <p className="text-[#3A4A57] dark:text-slate-300 leading-relaxed mb-4">
              {POSITIONING_STATEMENT}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-accent/20 rounded-full">
              <Badge variant="outline" className="border-accent/40 text-accent bg-accent/5">
                {BRAND_IDENTITY.category}
              </Badge>
              <span className="text-sm text-[#5A6B7A] dark:text-slate-400">•</span>
              <Badge variant="outline" className="border-accent/40 text-accent bg-accent/5">
                {BRAND_IDENTITY.subcategory}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Core Value Pillars */}
      <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-5 hover:shadow-lg transition-shadow dark:hover:shadow-slate-900/50">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-[#1B2733] dark:text-white mb-2">{VALUE_PILLARS.calmAndPredictability.title}</h3>
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400 leading-relaxed">
            {VALUE_PILLARS.calmAndPredictability.description}
          </p>
        </Card>

        <Card className="p-5 hover:shadow-lg transition-shadow dark:hover:shadow-slate-900/50">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
            <Heart className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-[#1B2733] dark:text-white mb-2">{VALUE_PILLARS.connectionAndConfidence.title}</h3>
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400 leading-relaxed">
            {VALUE_PILLARS.connectionAndConfidence.description}
          </p>
        </Card>

        <Card className="p-5 hover:shadow-lg transition-shadow dark:hover:shadow-slate-900/50">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-3">
            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold text-[#1B2733] dark:text-white mb-2">{VALUE_PILLARS.scienceAndSimplicity.title}</h3>
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400 leading-relaxed">
            {VALUE_PILLARS.scienceAndSimplicity.description}
          </p>
        </Card>
      </div>

      {/* Our Approach - ABA + AI */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733] dark:text-white">Our Approach: ABA + AI</h2>
          </div>
        </div>

        <div className="space-y-3 text-[#3A4A57] dark:text-slate-300 leading-relaxed">
          <p>
            ABA (Applied Behavior Analysis) isn't just for therapy centers—it's for breakfast time, car rides, getting dressed,
            and all the everyday moments that make up family life.
          </p>
          <p>
            {BRAND_IDENTITY.name} translates behavioral science into <strong>small daily wins</strong> that make family life calmer.
            Our adaptive AI learns your family's unique rhythm and personalizes guidance based on proven ABA principles.
          </p>

          <div className="bg-gradient-to-br from-[#FAF7F2] to-[#F0EDE8] dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 my-4">
            <h3 className="font-semibold text-[#1B2733] dark:text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Powered by Adaptive AI & ABA Science
            </h3>
            <ul className="space-y-2 ml-6 list-disc text-sm">
              <li><strong>Gentle cues</strong> instead of overwhelming instructions</li>
              <li><strong>Predictable routines</strong> that build safety and trust</li>
              <li><strong>Positive reinforcement</strong> to celebrate what's working</li>
              <li><strong>Progress tracking</strong> that shows meaningful growth over time</li>
              <li><strong>AI personalization</strong> that adapts to your family's unique needs</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* What We're Not (Legal Disclosure) */}
      {showLegal && (
        <Card className="p-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">Important Disclosure</h3>
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed mb-3">
                {LEGAL_PRIVACY.disclaimer}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                We provide wellness guidance and support—not medical diagnosis or clinical treatment.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Privacy & Safety */}
      <Card className="p-6 bg-[#FAF7F2] dark:bg-slate-800 border-[#E8E4DF] dark:border-slate-700">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#F0EDE8] dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-[#5A6B7A] dark:text-slate-400" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1B2733] dark:text-white mb-2">Your Privacy & Data</h3>
            <p className="text-sm text-[#3A4A57] dark:text-slate-300 leading-relaxed">
              {LEGAL_PRIVACY.privacyPromise} We use industry-standard encryption and security practices
              to keep your family's information safe.
            </p>
          </div>
        </div>
      </Card>

      {/* Version & Support */}
      <div className="pt-6 border-t border-[#E8E4DF] dark:border-slate-700 text-center">
        <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
          {BRAND_IDENTITY.name} v1.0 • Made with 💙 for families navigating neurodivergence
        </p>
      </div>
    </div>
  );
}
