// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Before/After Report Component
 * 
 * Generates compelling before/after comparisons for:
 * - Parents (to see progress)
 * - Providers (to inform care)
 * - Clinics (for pilot validation)
 * - Payers (for coverage conversations)
 * 
 * CRITICAL: Wellness/coaching language only. No medical claims.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Download, Share2, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { OutcomesEngine } from '../lib/outcomes-engine';

/** Shape the component actually consumes (engine stub returns a simpler shape for now) */
interface BeforeAfterMetric {
  before: number;
  after: number;
  change: number;
  improved: boolean;
}

interface BeforeAfterDisplaySummary {
  timeframe: string;
  overwhelm: BeforeAfterMetric;
  routineAdherence: BeforeAfterMetric;
  toughMoments: BeforeAfterMetric;
  goalProgress: BeforeAfterMetric;
}
import { HAPTICS } from '../lib/mobile-experience-enhancer';

interface BeforeAfterReportProps {
  userId: string;
  childId: string;
  childName: string;
  parentName: string;
  days?: 7 | 30;
}

export function BeforeAfterReport({ userId, childId, childName, parentName, days = 30 }: BeforeAfterReportProps) {
  const [summary, setSummary] = useState<BeforeAfterDisplaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullReport, setShowFullReport] = useState(false);

  const outcomesEngine = new OutcomesEngine(userId, childId);

  useEffect(() => {
    loadSummary();
  }, [days]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await outcomesEngine.generateBeforeAfterSummary(days);
      setSummary(data as unknown as BeforeAfterDisplaySummary);
    } catch (error) {
      console.error('Error loading before/after summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    HAPTICS.success();
    // Would generate PDF
    alert('PDF export would happen here - integrate with pdf-generator.ts');
  };

  const handleShare = () => {
    HAPTICS.success();
    // Would create shareable link
    alert('Share link would be generated here');
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[#E8E4DF] rounded w-3/4"></div>
          <div className="h-4 bg-[#E8E4DF] rounded w-full"></div>
          <div className="h-32 bg-[#E8E4DF] rounded"></div>
        </div>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-gray-600">Not enough data yet. Keep tracking for {days} days to see your before/after comparison!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero Section */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="text-center mb-4">
          <h2 className="text-2xl text-gray-900 mb-2">
            {childName}'s Progress Story
          </h2>
          <p className="text-sm text-gray-600">
            {summary.timeframe} of growth and learning
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <MetricCard
            title="Your Stress"
            before={summary.overwhelm.before}
            after={summary.overwhelm.after}
            change={summary.overwhelm.change}
            improved={summary.overwhelm.improved}
            unit="/10"
            inverted
          />
          <MetricCard
            title="Routine Completion"
            before={summary.routineAdherence.before}
            after={summary.routineAdherence.after}
            change={summary.routineAdherence.change}
            improved={summary.routineAdherence.improved}
            unit="%"
          />
          <MetricCard
            title="Tough Moments"
            before={summary.toughMoments.before}
            after={summary.toughMoments.after}
            change={summary.toughMoments.change}
            improved={summary.toughMoments.improved}
            unit="/week"
            inverted
          />
          <MetricCard
            title="Goal Progress"
            before={summary.goalProgress.before}
            after={summary.goalProgress.after}
            change={summary.goalProgress.change}
            improved={summary.goalProgress.improved}
            unit=" levels"
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleExportPDF}
            className="flex-1 bg-accent text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex-1"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </Card>

      {/* Detailed Story (Expandable) */}
      {showFullReport ? (
        <DetailedReport
          summary={summary}
          childName={childName}
          parentName={parentName}
          onCollapse={() => setShowFullReport(false)}
        />
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowFullReport(true)}
          className="w-full"
        >
          Show Full Progress Story
        </Button>
      )}

      {/* Disclaimer */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <p className="text-xs text-yellow-900">
          <strong>Important:</strong> This report shows wellness coaching and support progress, not medical treatment outcomes. This is educational guidance only. Parents remain the decision authority for all care decisions. For clinical questions, consult your child's healthcare providers.
        </p>
      </Card>
    </div>
  );
}

// ===================================
// METRIC CARD
// ===================================

function MetricCard({
  title,
  before,
  after,
  change,
  improved,
  unit,
  inverted = false
}: {
  title: string;
  before: number;
  after: number;
  change: number;
  improved: boolean;
  unit: string;
  inverted?: boolean;
}) {
  const displayChange = Math.abs(change);
  const showImproved = inverted ? !improved : improved;

  return (
    <Card className="p-3 bg-white">
      <div className="text-xs text-gray-600 mb-2">{title}</div>
      
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-xs text-gray-500">Before</div>
          <div className="text-lg font-semibold text-gray-400">
            {before}{unit}
          </div>
        </div>
        <div className={showImproved ? 'text-green-600' : 'text-orange-600'}>
          {showImproved ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        </div>
      </div>

      <div className="mb-2">
        <div className="text-xs text-gray-500">Now</div>
        <div className="text-2xl font-bold text-gray-900">
          {after}{unit}
        </div>
      </div>

      {displayChange > 0 && (
        <div className={`text-xs ${showImproved ? 'text-green-600' : 'text-orange-600'} flex items-center gap-1`}>
          {showImproved && <Check className="w-3 h-3" />}
          <span>{showImproved ? '+' : ''}{displayChange.toFixed(unit === '/10' ? 1 : 0)}{unit}</span>
        </div>
      )}
    </Card>
  );
}

// ===================================
// DETAILED REPORT
// ===================================

function DetailedReport({
  summary,
  childName,
  parentName,
  onCollapse
}: {
  summary: BeforeAfterDisplaySummary;
  childName: string;
  parentName: string;
  onCollapse: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <Card className="p-6 space-y-6">
        <div>
          <h3 className="text-lg text-gray-900 mb-2">Your Progress Story</h3>
          <p className="text-sm text-gray-700">
            {parentName}, here's what we've seen over the past {summary.timeframe}:
          </p>
        </div>

        {/* Parent Wellbeing */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            💙 Your Wellbeing
          </h4>
          <p className="text-sm text-gray-700 mb-2">
            {summary.overwhelm.improved ? (
              <>
                Your stress level decreased from <strong>{summary.overwhelm.before}/10</strong> to <strong>{summary.overwhelm.after}/10</strong>. 
                That's a <strong>{summary.overwhelm.change}-point improvement</strong>! You're getting the support you need.
              </>
            ) : (
              <>
                Your stress level is at <strong>{summary.overwhelm.after}/10</strong>. 
                We see you're carrying a lot. Let's find more ways to lighten your load.
              </>
            )}
          </p>
        </div>

        {/* Routine Consistency */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            ✅ Daily Routines
          </h4>
          <p className="text-sm text-gray-700 mb-2">
            {summary.routineAdherence.improved ? (
              <>
                Routine completion improved from <strong>{summary.routineAdherence.before}%</strong> to <strong>{summary.routineAdherence.after}%</strong>. 
                That's <strong>+{summary.routineAdherence.change}%</strong>! Consistency is building.
              </>
            ) : (
              <>
                {childName} is at <strong>{summary.routineAdherence.after}%</strong> completion. 
                Every percentage point is progress—let's keep building momentum together.
              </>
            )}
          </p>
        </div>

        {/* Challenging Moments */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            🤝 Tough Moments
          </h4>
          <p className="text-sm text-gray-700 mb-2">
            {summary.toughMoments.improved ? (
              <>
                Tough moments decreased from <strong>{summary.toughMoments.before}/week</strong> to <strong>{summary.toughMoments.after}/week</strong>. 
                That's <strong>{summary.toughMoments.change} fewer</strong> challenging situations. Your strategies are working!
              </>
            ) : (
              <>
                {childName} is experiencing <strong>{summary.toughMoments.after} tough moments per week</strong>. 
                Let's identify patterns and build more coping strategies together.
              </>
            )}
          </p>
        </div>

        {/* Goal Achievement */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            🎯 Goals & Skills
          </h4>
          <p className="text-sm text-gray-700 mb-2">
            {summary.goalProgress.improved ? (
              <>
                {childName}'s goal progress improved by <strong>+{summary.goalProgress.change} levels</strong> on average. 
                Real, measurable growth is happening!
              </>
            ) : summary.goalProgress.after > summary.goalProgress.before ? (
              <>
                {childName} is making progress on goals (+{summary.goalProgress.change} levels). 
                Growth takes time, and you're on the right track.
              </>
            ) : (
              <>
                Goals are holding steady. Sometimes we need to adjust our approach—let's review together.
              </>
            )}
          </p>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">What's Next?</h4>
          <ul className="space-y-1 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Keep building on what's working</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Ask your provider for strategies on areas that need support</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Celebrate every small win—progress compounds</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Share this progress with family and providers</span>
            </li>
          </ul>
        </div>

        <Button variant="outline" onClick={onCollapse} className="w-full">
          Collapse
        </Button>
      </Card>
    </motion.div>
  );
}

// ===================================
// USE IN WEEKLY REPORT
// ===================================

export function BeforeAfterSectionForPDF({ userId, childId, childName, parentName }: {
  userId: string;
  childId: string;
  childName: string;
  parentName: string;
}) {
  const [summary, setSummary] = useState<BeforeAfterDisplaySummary | null>(null);

  useEffect(() => {
    const engine = new OutcomesEngine(userId, childId);
    engine.generateBeforeAfterSummary(30).then(data => setSummary(data as unknown as BeforeAfterDisplaySummary));
  }, []);

  if (!summary) return null;

  return (
    <div className="page-break-before">
      <h2 className="text-lg font-semibold mb-4">30-Day Progress Summary</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="border border-gray-200 rounded p-3">
          <div className="text-sm text-gray-600 mb-1">Your Stress Level</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{summary.overwhelm.after}/10</span>
            <span className={`text-sm ${summary.overwhelm.improved ? 'text-green-600' : 'text-orange-600'}`}>
              {summary.overwhelm.improved ? `↓ ${summary.overwhelm.change}` : `↑ ${Math.abs(summary.overwhelm.change)}`}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Was {summary.overwhelm.before}/10</div>
        </div>

        <div className="border border-gray-200 rounded p-3">
          <div className="text-sm text-gray-600 mb-1">Routine Adherence</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{summary.routineAdherence.after}%</span>
            <span className={`text-sm ${summary.routineAdherence.improved ? 'text-green-600' : 'text-orange-600'}`}>
              {summary.routineAdherence.improved ? `+${summary.routineAdherence.change}%` : `${summary.routineAdherence.change}%`}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Was {summary.routineAdherence.before}%</div>
        </div>

        <div className="border border-gray-200 rounded p-3">
          <div className="text-sm text-gray-600 mb-1">Tough Moments</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{summary.toughMoments.after}/wk</span>
            <span className={`text-sm ${summary.toughMoments.improved ? 'text-green-600' : 'text-orange-600'}`}>
              {summary.toughMoments.improved ? `-${summary.toughMoments.change}` : `+${Math.abs(summary.toughMoments.change)}`}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Was {summary.toughMoments.before}/wk</div>
        </div>

        <div className="border border-gray-200 rounded p-3">
          <div className="text-sm text-gray-600 mb-1">Goal Progress</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">+{summary.goalProgress.after.toFixed(1)}</span>
            <span className={`text-sm ${summary.goalProgress.improved ? 'text-green-600' : 'text-orange-600'}`}>
              {summary.goalProgress.improved ? `↑` : `→`}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">GAS levels</div>
        </div>
      </div>

      <div className="text-xs text-gray-500 p-3 bg-[#FAF7F2] rounded border">
        <strong>Disclaimer:</strong> These metrics track wellness support and coaching progress. This is educational guidance only. Parents remain decision authority. Consult healthcare providers for clinical questions.
      </div>
    </div>
  );
}
