/**
 * AdminPortal - AACT Pilot Metrics Dashboard
 *
 * Tracks KPIs for the 150-family pilot:
 * - Onboarding completion (target: 70%)
 * - 7-day activation (target: 50-60%)
 * - DAU/WAU engagement (target: 30-40%)
 * - AI chat volume (target: 5-10 msgs/week)
 * - Therapy plan adherence (target: >70%)
 * - NPS scores
 * - B2B metrics for Trojan Horse strategy
 */

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Calendar,
  TrendingUp,
  Download,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  Target,
  Activity,
  FileText,
  Video,
  DollarSign,
  Building2,
  Heart
} from 'lucide-react';

interface AdminPortalProps {
  onBack?: () => void;
}

// Simulated pilot data - would come from Supabase in production
const PILOT_DATA = {
  overview: {
    totalFamilies: 150,
    activeFamilies: 127,
    pilotStartDate: '2025-11-01',
    pilotEndDate: '2026-01-01',
    daysRemaining: 21,
  },
  engagement: {
    onboardingCompletionRate: 84.7,
    sevenDayActivation: 58.3,
    dauWau: 37.2,
    weeklyRetention: 72.4,
    monthlyRetention: 65.8,
  },
  aiUsage: {
    totalConversations: 4823,
    avgMessagesPerWeek: 7.8,
    avgResponseSatisfaction: 4.6,
    topIntents: [
      { intent: 'Behavior strategy', count: 1245 },
      { intent: 'Routine help', count: 892 },
      { intent: 'Emotional support', count: 756 },
      { intent: 'Progress tracking', count: 534 },
      { intent: 'Provider questions', count: 412 },
    ],
    peakUsageHours: [9, 19, 21], // 9am, 7pm, 9pm
  },
  clinical: {
    therapyPlanAdherence: 73.2,
    routineCompletionRate: 68.5,
    goalProgressRate: 45.3,
    insightReportsGenerated: 342,
    outcomeTrackingEntries: 2156,
  },
  nps: {
    score: 72,
    promoters: 89,
    passives: 32,
    detractors: 6,
    responseRate: 84.7,
  },
  marketplace: {
    totalBookings: 234,
    avgSessionsPerFamily: 1.8,
    sessionCompletionRate: 94.2,
    revenue: 23400,
    avgRating: 4.8,
    topProviders: [
      { name: 'Dr. Sarah Chen, BCBA', sessions: 45, rating: 4.9 },
      { name: 'Marcus Johnson, RBT', sessions: 38, rating: 4.8 },
      { name: 'Dr. Emily Rodriguez', sessions: 32, rating: 4.9 },
    ],
  },
  b2bMetrics: {
    clinicsEngaged: 12,
    providersOnboarded: 34,
    insightReportsShared: 156,
    providerSatisfaction: 4.7,
    avgRevenuePerClinic: 1950,
  },
  tierDistribution: {
    free: 42,
    starter: 28,
    core: 67,
    pro: 13,
  },
};

// Helper to get status color
const getStatusColor = (value: number, target: number, isInverse = false) => {
  const ratio = isInverse ? target / value : value / target;
  if (ratio >= 1) return 'text-green-600 bg-green-50';
  if (ratio >= 0.8) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

const getStatusIcon = (value: number, target: number, isInverse = false) => {
  const ratio = isInverse ? target / value : value / target;
  if (ratio >= 1) return <CheckCircle className="w-4 h-4 text-green-600" />;
  if (ratio >= 0.8) return <Clock className="w-4 h-4 text-yellow-600" />;
  return <AlertCircle className="w-4 h-4 text-red-600" />;
};

export function AdminPortal({ onBack }: AdminPortalProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'engagement' | 'ai' | 'clinical' | 'marketplace' | 'b2b'>('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    // In production, this would generate a CSV/PDF report
    const data = JSON.stringify(PILOT_DATA, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aminy-pilot-metrics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate pilot progress
  const pilotProgress = useMemo(() => {
    const start = new Date(PILOT_DATA.overview.pilotStartDate);
    const end = new Date(PILOT_DATA.overview.pilotEndDate);
    const now = new Date();
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AACT Pilot Dashboard</h1>
                <p className="text-sm text-gray-500">150 Families | 60-Day Pilot</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Date Range Selector */}
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Pilot Progress Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Pilot Progress</span>
            <span className="text-sm text-gray-500">{PILOT_DATA.overview.daysRemaining} days remaining</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-500"
              style={{ width: `${pilotProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'engagement', label: 'Engagement', icon: TrendingUp },
              { id: 'ai', label: 'AI Usage', icon: MessageSquare },
              { id: 'clinical', label: 'Clinical', icon: Heart },
              { id: 'marketplace', label: 'Marketplace', icon: Video },
              { id: 'b2b', label: 'B2B Metrics', icon: Building2 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeSection === id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Active Families"
                value={PILOT_DATA.overview.activeFamilies}
                total={PILOT_DATA.overview.totalFamilies}
                icon={Users}
                trend="+8 this week"
              />
              <MetricCard
                label="Onboarding Rate"
                value={`${PILOT_DATA.engagement.onboardingCompletionRate}%`}
                target={70}
                current={PILOT_DATA.engagement.onboardingCompletionRate}
                icon={CheckCircle}
                isPercentage
              />
              <MetricCard
                label="7-Day Activation"
                value={`${PILOT_DATA.engagement.sevenDayActivation}%`}
                target={55}
                current={PILOT_DATA.engagement.sevenDayActivation}
                icon={Target}
                isPercentage
              />
              <MetricCard
                label="NPS Score"
                value={PILOT_DATA.nps.score}
                target={50}
                current={PILOT_DATA.nps.score}
                icon={Star}
                subtitle="Excellent"
              />
            </div>

            {/* Tier Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Distribution</h3>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(PILOT_DATA.tierDistribution).map(([tier, count]) => (
                  <div key={tier} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-500 capitalize">{tier}</div>
                    <div className="text-xs text-gray-400">
                      {((count / PILOT_DATA.overview.totalFamilies) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-gray-400 transition-all"
                  style={{ width: `${(PILOT_DATA.tierDistribution.free / 150) * 100}%` }}
                />
                <div
                  className="bg-blue-400 transition-all"
                  style={{ width: `${(PILOT_DATA.tierDistribution.starter / 150) * 100}%` }}
                />
                <div
                  className="bg-accent transition-all"
                  style={{ width: `${(PILOT_DATA.tierDistribution.core / 150) * 100}%` }}
                />
                <div
                  className="bg-purple-500 transition-all"
                  style={{ width: `${(PILOT_DATA.tierDistribution.pro / 150) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex justify-center gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-400 rounded" /> Free</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded" /> Starter</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-accent rounded" /> Core</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-500 rounded" /> Pro</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top KPIs vs Targets */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">KPIs vs Targets</h3>
                <div className="space-y-4">
                  <KPIRow label="Onboarding" value={84.7} target={70} />
                  <KPIRow label="7-Day Activation" value={58.3} target={55} />
                  <KPIRow label="DAU/WAU" value={37.2} target={35} />
                  <KPIRow label="Weekly Retention" value={72.4} target={70} />
                  <KPIRow label="Therapy Adherence" value={73.2} target={70} />
                </div>
              </div>

              {/* NPS Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">NPS Breakdown</h3>
                <div className="flex items-center justify-center mb-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-accent">{PILOT_DATA.nps.score}</div>
                    <div className="text-sm text-gray-500">Net Promoter Score</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <NPSBar label="Promoters (9-10)" count={PILOT_DATA.nps.promoters} total={127} color="bg-green-500" />
                  <NPSBar label="Passives (7-8)" count={PILOT_DATA.nps.passives} total={127} color="bg-yellow-400" />
                  <NPSBar label="Detractors (0-6)" count={PILOT_DATA.nps.detractors} total={127} color="bg-red-400" />
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Response rate: {PILOT_DATA.nps.responseRate}% ({PILOT_DATA.nps.promoters + PILOT_DATA.nps.passives + PILOT_DATA.nps.detractors} responses)
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'engagement' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="DAU/WAU"
                value={`${PILOT_DATA.engagement.dauWau}%`}
                target={35}
                current={PILOT_DATA.engagement.dauWau}
                icon={Activity}
                isPercentage
              />
              <MetricCard
                label="Weekly Retention"
                value={`${PILOT_DATA.engagement.weeklyRetention}%`}
                target={70}
                current={PILOT_DATA.engagement.weeklyRetention}
                icon={Users}
                isPercentage
              />
              <MetricCard
                label="Monthly Retention"
                value={`${PILOT_DATA.engagement.monthlyRetention}%`}
                target={60}
                current={PILOT_DATA.engagement.monthlyRetention}
                icon={Calendar}
                isPercentage
              />
              <MetricCard
                label="Avg Session Length"
                value="4.2 min"
                icon={Clock}
                subtitle="Target: 3+ min"
              />
            </div>

            {/* Engagement Funnel */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Funnel</h3>
              <div className="space-y-4">
                <FunnelStep step="1" label="Signed Up" value={150} percentage={100} />
                <FunnelStep step="2" label="Completed Onboarding" value={127} percentage={84.7} />
                <FunnelStep step="3" label="First AI Conversation" value={118} percentage={78.7} />
                <FunnelStep step="4" label="Active Week 1" value={87} percentage={58} />
                <FunnelStep step="5" label="Active Week 2+" value={72} percentage={48} />
                <FunnelStep step="6" label="Paid Conversion" value={108} percentage={72} />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'ai' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Total Conversations"
                value={PILOT_DATA.aiUsage.totalConversations.toLocaleString()}
                icon={MessageSquare}
                trend="+342 this week"
              />
              <MetricCard
                label="Avg Msgs/Week"
                value={PILOT_DATA.aiUsage.avgMessagesPerWeek}
                target={7.5}
                current={PILOT_DATA.aiUsage.avgMessagesPerWeek}
                icon={TrendingUp}
                subtitle="Target: 5-10"
              />
              <MetricCard
                label="Satisfaction"
                value={`${PILOT_DATA.aiUsage.avgResponseSatisfaction}/5`}
                icon={Star}
                subtitle="Excellent"
              />
              <MetricCard
                label="Peak Usage"
                value="7-9 PM"
                icon={Clock}
                subtitle="After dinner"
              />
            </div>

            {/* Top Intents */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top AI Conversation Topics</h3>
              <div className="space-y-3">
                {PILOT_DATA.aiUsage.topIntents.map((intent, i) => (
                  <div key={intent.intent} className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-6">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{intent.intent}</span>
                        <span className="text-sm text-gray-500">{intent.count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent/70 rounded-full"
                          style={{ width: `${(intent.count / PILOT_DATA.aiUsage.topIntents[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Memory System Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Memory System</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">2,847</div>
                  <div className="text-sm text-gray-500">Facts Learned</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">89%</div>
                  <div className="text-sm text-gray-500">Memory Accuracy</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">456</div>
                  <div className="text-sm text-gray-500">Documents Processed</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'clinical' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Plan Adherence"
                value={`${PILOT_DATA.clinical.therapyPlanAdherence}%`}
                target={70}
                current={PILOT_DATA.clinical.therapyPlanAdherence}
                icon={Target}
                isPercentage
              />
              <MetricCard
                label="Routine Completion"
                value={`${PILOT_DATA.clinical.routineCompletionRate}%`}
                target={65}
                current={PILOT_DATA.clinical.routineCompletionRate}
                icon={CheckCircle}
                isPercentage
              />
              <MetricCard
                label="Goal Progress"
                value={`${PILOT_DATA.clinical.goalProgressRate}%`}
                target={40}
                current={PILOT_DATA.clinical.goalProgressRate}
                icon={TrendingUp}
                isPercentage
              />
              <MetricCard
                label="Insight Reports"
                value={PILOT_DATA.clinical.insightReportsGenerated}
                icon={FileText}
                subtitle="Generated"
              />
            </div>

            {/* Outcomes Tracking */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Outcomes Tracking</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-accent">{PILOT_DATA.clinical.outcomeTrackingEntries.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Data Points Collected</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent">14.3</div>
                  <div className="text-sm text-gray-500">Avg Entries/Family</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent">89%</div>
                  <div className="text-sm text-gray-500">Weekly Tracking Rate</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent">4.2</div>
                  <div className="text-sm text-gray-500">Avg Improvement Score</div>
                </div>
              </div>
            </div>

            {/* Condition Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">By Primary Condition</h3>
              <div className="grid grid-cols-3 gap-4">
                <ConditionCard condition="Autism" families={78} adherence={75.2} improvement={4.3} />
                <ConditionCard condition="ADHD" families={52} adherence={71.8} improvement={4.1} />
                <ConditionCard condition="Anxiety" families={20} adherence={69.5} improvement={4.0} />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'marketplace' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Total Bookings"
                value={PILOT_DATA.marketplace.totalBookings}
                icon={Calendar}
                trend="+28 this week"
              />
              <MetricCard
                label="Sessions/Family"
                value={PILOT_DATA.marketplace.avgSessionsPerFamily}
                icon={Video}
                subtitle="Average"
              />
              <MetricCard
                label="Completion Rate"
                value={`${PILOT_DATA.marketplace.sessionCompletionRate}%`}
                icon={CheckCircle}
                subtitle="Excellent"
              />
              <MetricCard
                label="Revenue"
                value={`$${PILOT_DATA.marketplace.revenue.toLocaleString()}`}
                icon={DollarSign}
                trend="+$2,400 this week"
              />
            </div>

            {/* Top Providers */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Providers</h3>
              <div className="space-y-4">
                {PILOT_DATA.marketplace.topProviders.map((provider, i) => (
                  <div key={provider.name} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{provider.name}</div>
                      <div className="text-sm text-gray-500">{provider.sessions} sessions completed</div>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-medium">{provider.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">$100</div>
                  <div className="text-sm text-gray-500">Avg Session Price</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-accent">$156</div>
                  <div className="text-sm text-gray-500">Revenue/Active Family</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">15%</div>
                  <div className="text-sm text-gray-500">Platform Fee</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'b2b' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Clinics Engaged"
                value={PILOT_DATA.b2bMetrics.clinicsEngaged}
                icon={Building2}
                subtitle="In pilot"
              />
              <MetricCard
                label="Providers Onboarded"
                value={PILOT_DATA.b2bMetrics.providersOnboarded}
                icon={Users}
                trend="+6 this month"
              />
              <MetricCard
                label="Reports Shared"
                value={PILOT_DATA.b2bMetrics.insightReportsShared}
                icon={FileText}
                subtitle="To providers"
              />
              <MetricCard
                label="Provider NPS"
                value={`${PILOT_DATA.b2bMetrics.providerSatisfaction}/5`}
                icon={Star}
                subtitle="Excellent"
              />
            </div>

            {/* B2B Trojan Horse Metrics */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">B2B "Trojan Horse" Strategy</h3>
              <p className="text-sm text-gray-500 mb-6">Families bringing Aminy into their clinics</p>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-accent/5 rounded-lg">
                  <div className="text-3xl font-bold text-accent mb-1">68%</div>
                  <div className="text-sm text-gray-600">Families shared Insight Report with provider</div>
                </div>
                <div className="text-center p-4 bg-accent/5 rounded-lg">
                  <div className="text-3xl font-bold text-accent mb-1">12</div>
                  <div className="text-sm text-gray-600">Clinics requested enterprise demo</div>
                </div>
                <div className="text-center p-4 bg-accent/5 rounded-lg">
                  <div className="text-3xl font-bold text-accent mb-1">$23K</div>
                  <div className="text-sm text-gray-600">Projected annual B2B revenue</div>
                </div>
              </div>
            </div>

            {/* Clinic Pipeline */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinic Pipeline</h3>
              <div className="space-y-3">
                <PipelineRow stage="Awareness" count={24} />
                <PipelineRow stage="Interest" count={12} />
                <PipelineRow stage="Demo Scheduled" count={8} />
                <PipelineRow stage="Negotiation" count={4} />
                <PipelineRow stage="Closed Won" count={2} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  target?: number;
  current?: number;
  total?: number;
  trend?: string;
  subtitle?: string;
  isPercentage?: boolean;
}

function MetricCard({ label, value, icon: Icon, target, current, total, trend, subtitle, isPercentage }: MetricCardProps) {
  const statusColors = target && current ? getStatusColor(current, target) : '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`p-2 rounded-lg ${statusColors || 'bg-gray-50'}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {value}
        {total && <span className="text-sm font-normal text-gray-400">/{total}</span>}
      </div>
      {trend && <p className="text-xs text-green-600 mt-1">{trend}</p>}
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      {target && current && (
        <div className="flex items-center gap-1 mt-1">
          {getStatusIcon(current, target)}
          <span className="text-xs text-gray-500">Target: {target}{isPercentage ? '%' : ''}</span>
        </div>
      )}
    </div>
  );
}

// KPI Row Component
function KPIRow({ label, value, target }: { label: string; value: number; target: number }) {
  const percentage = (value / target) * 100;
  const isOnTrack = value >= target;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isOnTrack ? 'text-green-600' : 'text-yellow-600'}`}>
            {value}%
          </span>
          <span className="text-xs text-gray-400">/ {target}%</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOnTrack ? 'bg-green-500' : 'bg-yellow-400'}`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

// NPS Bar Component
function NPSBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = (count / total) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium text-gray-900">{count}</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Funnel Step Component
function FunnelStep({ step, label, value, percentage }: { step: string; label: string; value: number; percentage: number }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center text-accent font-bold text-sm">
        {step}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          <span className="text-sm text-gray-500">{value} ({percentage}%)</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent/70 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Condition Card Component
function ConditionCard({ condition, families, adherence, improvement }: {
  condition: string;
  families: number;
  adherence: number;
  improvement: number;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg text-center">
      <div className="text-lg font-semibold text-gray-900 mb-2">{condition}</div>
      <div className="text-sm text-gray-500 mb-3">{families} families</div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Adherence:</span>
          <span className="font-medium text-gray-900">{adherence}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Improvement:</span>
          <span className="font-medium text-green-600">+{improvement}</span>
        </div>
      </div>
    </div>
  );
}

// Pipeline Row Component
function PipelineRow({ stage, count }: { stage: string; count: number }) {
  const maxCount = 24; // Awareness count as max
  const percentage = (count / maxCount) * 100;

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600 w-32">{stage}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
        <div
          className="h-full bg-accent/70 flex items-center justify-end px-2"
          style={{ width: `${percentage}%` }}
        >
          <span className="text-xs font-medium text-white">{count}</span>
        </div>
      </div>
    </div>
  );
}

export default AdminPortal;
