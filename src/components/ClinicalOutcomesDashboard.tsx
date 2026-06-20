/**
 * Clinical Outcomes Dashboard
 *
 * Shows per-child outcome metrics for providers:
 * - Pre/post assessment scores
 * - Skill progress over time (CSS bar charts)
 * - Behavior frequency trends
 * - Aggregated view across all clients
 * - Time range selector (30/60/90 days)
 *
 * Data sourced from outcome_goals, outcome_data_points, behavior_logs,
 * and care_plans tables via Supabase.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import type { OutcomeCategory } from '../lib/outcome-tracking';
import { isDemoMode } from '../lib/demo-seed';

// ============================================================================
// Types
// ============================================================================

interface ChildOutcome {
  childId: string;
  childName: string;
  age: number;
  preScore: number;
  postScore: number;
  assessmentType: string;
  improvementPct: number;
  goals: GoalProgress[];
  behaviorTrends: BehaviorTrend[];
}

interface GoalProgress {
  id: string;
  title: string;
  category: OutcomeCategory;
  baseline: number;
  current: number;
  target: number;
  percentComplete: number;
  trend: 'improving' | 'stable' | 'declining';
  unit: string;
}

interface BehaviorTrend {
  behavior: string;
  type: 'target' | 'challenging';
  dataPoints: { date: string; value: number }[];
  avgLast30: number;
  avgPrevious30: number;
  changePercent: number;
}

interface AggregateMetrics {
  totalClients: number;
  activeGoals: number;
  goalsCompleted: number;
  avgImprovement: number;
  categoryBreakdown: { category: string; count: number; avgProgress: number }[];
}

type TimeRange = 30 | 60 | 90;

// ============================================================================
// Demo Data
// ============================================================================

const DEMO_CHILDREN: ChildOutcome[] = [
  {
    childId: 'child-001',
    childName: 'Alex M.',
    age: 4,
    preScore: 72,
    postScore: 45,
    assessmentType: 'CARS-2',
    improvementPct: 37.5,
    goals: [
      { id: 'g1', title: 'Mand repertoire (requesting)', category: 'communication', baseline: 12, current: 38, target: 50, percentComplete: 68, trend: 'improving', unit: 'words' },
      { id: 'g2', title: 'Peer interaction duration', category: 'social', baseline: 2, current: 8, target: 15, percentComplete: 46, trend: 'improving', unit: 'minutes' },
      { id: 'g3', title: 'Independent self-care steps', category: 'self-care', baseline: 3, current: 7, target: 10, percentComplete: 57, trend: 'stable', unit: 'steps' },
      { id: 'g4', title: 'Emotional regulation episodes', category: 'emotional', baseline: 8, current: 3, target: 1, percentComplete: 71, trend: 'improving', unit: 'per day' },
    ],
    behaviorTrends: [
      { behavior: 'Functional communication', type: 'target', dataPoints: generateTrendData(15, 42, 30), avgLast30: 38, avgPrevious30: 24, changePercent: 58.3 },
      { behavior: 'Tantrums', type: 'challenging', dataPoints: generateTrendData(12, 3, 30), avgLast30: 4, avgPrevious30: 9, changePercent: -55.6 },
    ],
  },
  {
    childId: 'child-002',
    childName: 'Jordan K.',
    age: 6,
    preScore: 58,
    postScore: 41,
    assessmentType: 'CBCL',
    improvementPct: 29.3,
    goals: [
      { id: 'g5', title: 'Letter recognition', category: 'academic', baseline: 8, current: 22, target: 26, percentComplete: 78, trend: 'improving', unit: 'letters' },
      { id: 'g6', title: 'Fine motor tasks', category: 'motor', baseline: 2, current: 5, target: 8, percentComplete: 50, trend: 'improving', unit: 'tasks' },
      { id: 'g7', title: 'Classroom transitions', category: 'behavior', baseline: 1, current: 6, target: 8, percentComplete: 71, trend: 'stable', unit: 'successful/day' },
    ],
    behaviorTrends: [
      { behavior: 'On-task behavior', type: 'target', dataPoints: generateTrendData(20, 55, 30), avgLast30: 50, avgPrevious30: 32, changePercent: 56.3 },
      { behavior: 'Elopement attempts', type: 'challenging', dataPoints: generateTrendData(5, 1, 30), avgLast30: 1.5, avgPrevious30: 4, changePercent: -62.5 },
    ],
  },
  {
    childId: 'child-003',
    childName: 'Sam T.',
    age: 3,
    preScore: 85,
    postScore: 68,
    assessmentType: 'M-CHAT-R',
    improvementPct: 20.0,
    goals: [
      { id: 'g8', title: 'Eye contact on name call', category: 'social', baseline: 10, current: 55, target: 80, percentComplete: 64, trend: 'improving', unit: '% trials' },
      { id: 'g9', title: 'Imitation skills', category: 'communication', baseline: 5, current: 18, target: 25, percentComplete: 65, trend: 'improving', unit: 'actions' },
    ],
    behaviorTrends: [
      { behavior: 'Joint attention', type: 'target', dataPoints: generateTrendData(10, 35, 30), avgLast30: 30, avgPrevious30: 16, changePercent: 87.5 },
      { behavior: 'Self-stimulatory behavior', type: 'challenging', dataPoints: generateTrendData(25, 15, 30), avgLast30: 16, avgPrevious30: 22, changePercent: -27.3 },
    ],
  },
];

const DEMO_AGGREGATE: AggregateMetrics = {
  totalClients: 12,
  activeGoals: 38,
  goalsCompleted: 14,
  avgImprovement: 28.9,
  categoryBreakdown: [
    { category: 'Communication', count: 12, avgProgress: 67 },
    { category: 'Social', count: 8, avgProgress: 55 },
    { category: 'Behavior', count: 9, avgProgress: 62 },
    { category: 'Self-Care', count: 5, avgProgress: 48 },
    { category: 'Academic', count: 4, avgProgress: 72 },
  ],
};

function generateTrendData(startVal: number, endVal: number, days: number): { date: string; value: number }[] {
  const points: { date: string; value: number }[] = [];
  const now = new Date();
  for (let i = days; i >= 0; i -= 3) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const progress = (days - i) / days;
    const noise = (Math.random() - 0.5) * (Math.abs(endVal - startVal) * 0.2);
    const value = Math.round(startVal + (endVal - startVal) * progress + noise);
    points.push({ date: date.toISOString().split('T')[0], value: Math.max(0, value) });
  }
  return points;
}

// ============================================================================
// Component
// ============================================================================

type ViewMode = 'individual' | 'aggregate';

export default function ClinicalOutcomesDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('individual');
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [children, setChildren] = useState<ChildOutcome[]>([]);
  const [aggregate, setAggregate] = useState<AggregateMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  async function loadData() {
    setLoading(true);
    try {
      // Attempt Supabase fetch
      const { data: goalsData } = await supabase
        .from('outcome_goals')
        .select('*, data_points:outcome_data_points(*)')
        .gte('created_at', new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString());

      if (goalsData && goalsData.length > 0) {
        // Map real data... would transform here.
        // Until the real transform lands, only fall back to sample data in
        // demo mode so real providers never see fabricated client outcomes.
        setChildren(isDemoMode() ? DEMO_CHILDREN : []);
        setAggregate(isDemoMode() ? DEMO_AGGREGATE : null);
      } else {
        setChildren(isDemoMode() ? DEMO_CHILDREN : []);
        setAggregate(isDemoMode() ? DEMO_AGGREGATE : null);
      }
    } catch {
      setChildren(isDemoMode() ? DEMO_CHILDREN : []);
      setAggregate(isDemoMode() ? DEMO_AGGREGATE : null);
    }
    setLoading(false);
  }

  const activeChild = selectedChild
    ? children.find((c) => c.childId === selectedChild)
    : children[0];

  return (
    <div className="min-h-screen bg-mist p-4">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-[#0D1B2A] mb-1">
          Clinical Outcomes
        </h1>
        <p className="text-sm text-[#5A6B7A]">
          Track progress, measure impact, demonstrate results
        </p>
      </div>

      {/* View Mode + Time Range */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-[#E8E4DF]">
          <button
            onClick={() => setViewMode('individual')}
            className={`px-4 py-2 text-[13px] font-semibold border-none cursor-pointer ${
              viewMode === 'individual' ? 'bg-[#0D1B2A] text-white' : 'bg-white text-[#5A6B7A]'
            }`}
          >
            Per Child
          </button>
          <button
            onClick={() => setViewMode('aggregate')}
            className={`px-4 py-2 text-[13px] font-semibold border-none cursor-pointer ${
              viewMode === 'aggregate' ? 'bg-[#0D1B2A] text-white' : 'bg-white text-[#5A6B7A]'
            }`}
          >
            All Clients
          </button>
        </div>
        <div className="flex gap-1 ml-auto">
          {([30, 60, 90] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-2 text-xs font-semibold rounded-md cursor-pointer ${
                timeRange === range
                  ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-500'
                  : 'border border-[#E8E4DF] bg-white text-[#5A6B7A]'
              }`}
            >
              {range}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : children.length === 0 && !aggregate ? (
        <OutcomesEmptyState />
      ) : viewMode === 'individual' ? (
        <IndividualView
          children={children}
          activeChild={activeChild || null}
          onSelectChild={setSelectedChild}
        />
      ) : (
        <AggregateView aggregate={aggregate} children={children} />
      )}
    </div>
  );
}

function OutcomesEmptyState() {
  return (
    <div className="bg-white rounded-xl p-8 shadow-sm flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-[#FAF7F2] flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-[#577590]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 3 3 5-6" />
        </svg>
      </div>
      <h3 className="text-[15px] font-bold text-[#0D1B2A] mb-1">No outcome data yet</h3>
      <p className="text-[13px] text-[#577590] max-w-xs">
        Once your clients have goals and assessment scores logged, their progress and
        impact will appear here.
      </p>
    </div>
  );
}

// ============================================================================
// Individual View
// ============================================================================

function IndividualView({
  children,
  activeChild,
  onSelectChild,
}: {
  children: ChildOutcome[];
  activeChild: ChildOutcome | null;
  onSelectChild: (id: string) => void;
}) {
  return (
    <>
      {/* Child Selector */}
      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {children.map((child) => (
          <button
            key={child.childId}
            onClick={() => onSelectChild(child.childId)}
            className={`px-4 py-2.5 rounded-lg border-none cursor-pointer whitespace-nowrap shadow-sm font-semibold text-[13px] ${
              activeChild?.childId === child.childId
                ? 'bg-[#0D1B2A] text-white'
                : 'bg-white text-[#0D1B2A]'
            }`}
          >
            {child.childName} ({child.age}y)
          </button>
        ))}
      </div>

      {activeChild && (
        <>
          {/* Pre/Post Scores */}
          <PrePostCard child={activeChild} />

          {/* Goal Progress */}
          <div className="bg-white rounded-xl p-4 shadow-sm mt-3">
            <h3 className="text-[15px] font-bold text-[#0D1B2A] mb-3">
              Goal Progress
            </h3>
            {activeChild.goals.map((goal) => (
              <GoalBar key={goal.id} goal={goal} />
            ))}
          </div>

          {/* Behavior Trends */}
          <div className="bg-white rounded-xl p-4 shadow-sm mt-3">
            <h3 className="text-[15px] font-bold text-[#0D1B2A] mb-3">
              Behavior Trends
            </h3>
            {activeChild.behaviorTrends.map((trend, i) => (
              <BehaviorTrendChart key={i} trend={trend} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ============================================================================
// Pre/Post Score Card
// ============================================================================

function PrePostCard({ child }: { child: ChildOutcome }) {
  const improved = child.postScore < child.preScore; // Lower is better for most assessments
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[15px] font-bold text-[#0D1B2A]">
          Assessment Comparison
        </h3>
        <span className="text-xs text-[#5A6B7A] bg-[#F0EDE8] px-2 py-0.5 rounded">
          {child.assessmentType}
        </span>
      </div>

      <div className="flex gap-3 mb-3">
        <div className="flex-1 text-center bg-red-50 rounded-lg p-3">
          <div className="text-xs text-[#E07A5F] font-semibold mb-1">PRE</div>
          <div className="text-[28px] font-extrabold text-[#E07A5F]">{child.preScore}</div>
        </div>
        <div className="flex-1 text-center bg-emerald-50 rounded-lg p-3">
          <div className="text-xs text-emerald-500 font-semibold mb-1">POST</div>
          <div className="text-[28px] font-extrabold text-emerald-500">{child.postScore}</div>
        </div>
      </div>

      <div className={`text-center p-2 rounded-md text-[13px] font-semibold ${
        improved ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
      }`}>
        {improved ? '\u2191' : '\u2193'} {child.improvementPct.toFixed(1)}% improvement
      </div>
    </div>
  );
}

// ============================================================================
// Goal Progress Bar
// ============================================================================

function GoalBar({ goal }: { goal: GoalProgress }) {
  const trendColorClasses = { improving: 'text-emerald-500', stable: 'text-amber-400', declining: 'text-[#E07A5F]' };
  const trendBgClasses = { improving: 'bg-emerald-500', stable: 'bg-amber-400', declining: 'bg-[#E07A5F]' };
  const trendLabels = { improving: 'Improving', stable: 'Stable', declining: 'Needs attention' };

  return (
    <div className="mb-3.5">
      <div className="flex justify-between mb-1">
        <span className="text-[13px] font-semibold text-[#0D1B2A]">{goal.title}</span>
        <span className={`text-xs font-semibold ${trendColorClasses[goal.trend]}`}>
          {trendLabels[goal.trend]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2.5 bg-[#E8E4DF] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-in-out ${trendBgClasses[goal.trend]}`}
            style={{ width: `${Math.min(goal.percentComplete, 100)}%` }}
          />
        </div>
        <span className="text-xs font-bold text-[#0D1B2A] min-w-[36px] text-right">
          {goal.percentComplete}%
        </span>
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-xs text-[#8A9BA8]">Baseline: {goal.baseline} {goal.unit}</span>
        <span className="text-xs text-[#8A9BA8]">Current: {goal.current} / Target: {goal.target} {goal.unit}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Behavior Trend Chart (CSS mini bar chart)
// ============================================================================

function BehaviorTrendChart({ trend }: { trend: BehaviorTrend }) {
  const isTarget = trend.type === 'target';
  const isPositive = isTarget ? trend.changePercent > 0 : trend.changePercent < 0;
  const colorClass = isPositive ? 'text-emerald-500' : 'text-[#E07A5F]';
  const barBgClass = isPositive ? 'bg-emerald-500' : 'bg-[#E07A5F]';
  const maxVal = Math.max(...trend.dataPoints.map((d) => d.value), 1);

  return (
    <div className="mb-4 pb-3 border-b border-[#E8E4DF]">
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="text-[13px] font-semibold text-[#0D1B2A]">{trend.behavior}</span>
          <span className={`text-xs font-semibold ml-1.5 px-1.5 py-px rounded-sm ${
            isTarget ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-[#E07A5F]'
          }`}>
            {isTarget ? 'TARGET' : 'CHALLENGING'}
          </span>
        </div>
        <span className={`text-xs font-bold ${colorClass}`}>
          {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
        </span>
      </div>

      {/* Mini bar chart */}
      <div className="flex items-end gap-0.5 h-10">
        {trend.dataPoints.map((point, i) => (
          <div
            key={i}
            className={`flex-1 min-h-[2px] rounded-t-sm ${barBgClass}`}
            style={{
              height: `${(point.value / maxVal) * 100}%`,
              opacity: 0.5 + (i / trend.dataPoints.length) * 0.5,
            }}
            title={`${point.date}: ${point.value}`}
          />
        ))}
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-xs text-[#8A9BA8]">
          Prev 30d avg: {trend.avgPrevious30.toFixed(1)}
        </span>
        <span className="text-xs text-[#8A9BA8]">
          Last 30d avg: {trend.avgLast30.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Aggregate View
// ============================================================================

function AggregateView({ aggregate, children }: { aggregate: AggregateMetrics | null; children: ChildOutcome[] }) {
  if (!aggregate) return null;

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <MetricCard label="Active Clients" value={aggregate.totalClients.toString()} colorClass="text-[#0D1B2A]" />
        <MetricCard label="Active Goals" value={aggregate.activeGoals.toString()} colorClass="text-[#5A6B7A]" />
        <MetricCard label="Goals Met" value={aggregate.goalsCompleted.toString()} colorClass="text-emerald-500" />
        <MetricCard label="Avg Improvement" value={`${aggregate.avgImprovement.toFixed(1)}%`} colorClass="text-[#E07A5F]" />
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-[15px] font-bold text-[#0D1B2A] mb-3.5">
          Progress by Category
        </h3>
        {aggregate.categoryBreakdown.map((cat, i) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-[13px] font-semibold text-[#0D1B2A]">{cat.category}</span>
              <span className="text-xs text-[#5A6B7A]">{cat.count} goals / {cat.avgProgress}% avg</span>
            </div>
            <div className="h-2 bg-[#E8E4DF] rounded overflow-hidden">
              <div
                className={`h-full rounded ${getCategoryBgClass(i)}`}
                style={{ width: `${cat.avgProgress}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Client Overview */}
      <div className="bg-white rounded-xl p-4 shadow-sm mt-3">
        <h3 className="text-[15px] font-bold text-[#0D1B2A] mb-3">
          Client Outcomes Summary
        </h3>
        {children.map((child) => (
          <div key={child.childId} className="flex justify-between items-center py-2.5 border-b border-[#E8E4DF]">
            <div>
              <div className="text-[13px] font-semibold text-[#0D1B2A]">{child.childName}</div>
              <div className="text-xs text-[#5A6B7A]">{child.goals.length} active goals</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-emerald-500">
                +{child.improvementPct.toFixed(1)}%
              </div>
              <div className="text-xs text-[#8A9BA8]">{child.assessmentType}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function MetricCard({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  return (
    <div className="bg-white rounded-xl p-3.5 shadow-sm">
      <div className="text-xs text-[#5A6B7A] font-semibold mb-1">{label}</div>
      <div className={`text-2xl font-extrabold ${colorClass}`}>{value}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl p-5 h-[100px] shadow-sm">
          <div className="w-3/5 h-3.5 bg-[#E8E4DF] rounded mb-3" />
          <div className="w-2/5 h-2.5 bg-[#E8E4DF] rounded" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getCategoryBgClass(index: number): string {
  const classes = ['bg-emerald-500', 'bg-slate-500', 'bg-[#E07A5F]', 'bg-amber-400', 'bg-[#264653]'];
  return classes[index % classes.length];
}
