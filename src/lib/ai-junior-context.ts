/**
 * AI Junior Context — Ask Aminy AI Integration
 *
 * Provides the Ask Aminy chat with rich, structured context about
 * Junior session data so the AI can:
 *   1. Answer parent questions: "How is Eddie doing in speech?"
 *   2. Reference actual session data in responses
 *   3. Recommend activities based on gaps
 *   4. Generate "Weekly Junior Reports" with trends
 *   5. Proactively suggest: "Eddie might benefit from more sensory breaks"
 *
 * This module is the GLUE between:
 *   - junior-insights-bridge.ts (Child → Parent data)
 *   - parent-focus-bridge.ts (Parent → Child settings)
 *   - parent-junior-bridge.ts (existing bridge)
 *   - ai-conversation-engine.ts (Ask Aminy chat)
 *   - proactive-insights.ts (insight engine)
 *
 * Architecture:
 *   AIJuniorContextProvider (class, singleton)
 *     - buildConversationContext(userId, childId)  → AI system prompt injection
 *     - answerJuniorQuestion(childId, question)    → structured answer data
 *     - generateWeeklyReport(childId)              → formatted report string
 *     - getProactiveSuggestions(childId)            → AI-ready suggestions
 *     - detectJuniorIntent(userMessage)             → whether message is Junior-related
 */

import { supabase } from '../utils/supabase/client';
import {
  collectJuniorSnapshot,
  type SessionSnapshot,
  type DomainStat,
  type PatternAlert,
  type ProactiveAlert,
} from './junior-insights-bridge';
import {
  getParentFocusBridge,
  type ChildFocusProfile,
} from './parent-focus-bridge';
import {
  buildParentAIContext,
  getRecentProgress,
  generateWeeklySummary,
  getFocusAreas,
  type JuniorProgressEntry,
  type JuniorWeeklySummary,
  type FocusDomain,
} from './parent-junior-bridge';

// ============================================================================
// Types
// ============================================================================

export interface JuniorAIContext {
  /** Full system prompt injection for the AI conversation */
  systemPromptSection: string;
  /** Structured data the AI can reference */
  structuredData: JuniorContextData;
  /** Pre-generated suggestions the AI can surface */
  proactiveSuggestions: string[];
  /** Whether the context has meaningful data (vs empty/new user) */
  hasData: boolean;
}

export interface JuniorContextData {
  childId: string;
  childName: string;
  snapshot: SessionSnapshot | null;
  focusProfile: ChildFocusProfile | null;
  weeklySummary: JuniorWeeklySummary | null;
  recentActivities: JuniorProgressEntry[];
  activeAlerts: PatternAlert[];
  proactiveAlerts: ProactiveAlert[];
}

export interface JuniorQuestionAnswer {
  /** Direct answer text */
  answer: string;
  /** Supporting data points */
  dataPoints: Array<{ label: string; value: string }>;
  /** Suggested follow-up questions */
  followUps: string[];
  /** Whether this answer uses real data vs generic info */
  datadriven: boolean;
}

export interface WeeklyReport {
  /** Report title */
  title: string;
  /** Date range */
  period: string;
  /** Executive summary paragraph */
  summary: string;
  /** Domain-by-domain breakdown */
  domainSections: Array<{
    domain: string;
    status: 'great' | 'good' | 'needs_attention' | 'no_data';
    accuracy: number;
    sessions: number;
    trend: string;
    detail: string;
  }>;
  /** Celebrations/wins */
  highlights: string[];
  /** Areas needing attention */
  concerns: string[];
  /** Actionable recommendations */
  recommendations: string[];
  /** Engagement stats */
  stats: {
    totalSessions: number;
    totalMinutes: number;
    activeDays: number;
    streak: number;
    completionRate: number;
  };
}

// ============================================================================
// Junior-Related Intent Keywords
// ============================================================================

const JUNIOR_INTENT_KEYWORDS = [
  'junior', 'activity', 'activities', 'speech', 'social skills',
  'practice', 'session', 'sessions', 'accuracy', 'progress',
  'how is', 'how\'s', 'doing in', 'doing with', 'improve',
  'sensory', 'calm corner', 'regulation', 'executive function',
  'difficulty', 'level', 'easier', 'harder', 'focus area',
  'weekly report', 'report', 'summary', 'streak', 'tokens',
  'articulation', 'phoneme', 'vocabulary', 'narrative',
  'turn-taking', 'conversation', 'perspective', 'emotion',
  'working memory', 'planning', 'sequencing', 'aac',
  'game', 'games', 'play', 'practiced', 'completed',
];

const JUNIOR_QUESTION_PATTERNS = [
  /how (?:is|are|was|were) (?:my (?:child|kid|son|daughter)|he|she|they) doing/i,
  /(?:progress|performance|accuracy) (?:in|on|with|for)/i,
  /what (?:has|did) (?:he|she|they|my (?:child|kid)) (?:practice|do|complete)/i,
  /should (?:we|i) (?:focus|work) on/i,
  /(?:weekly|daily) (?:report|summary|update)/i,
  /any (?:concerns|issues|problems|patterns)/i,
  /recommend(?:ation)?s? (?:for|about)/i,
];

// ============================================================================
// AIJuniorContextProvider Class
// ============================================================================

export class AIJuniorContextProvider {
  /** Cache snapshots for 5 minutes to avoid repeated fetches during a conversation */
  private snapshotCache = new Map<string, { snapshot: SessionSnapshot; cachedAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  // ==========================================================================
  // Main Context Builder
  // ==========================================================================

  /**
   * Build the full conversation context for Ask Aminy.
   * This is injected into the AI system prompt so it has Junior data.
   */
  async buildConversationContext(
    userId: string,
    childId: string,
    childName?: string,
  ): Promise<JuniorAIContext> {
    const name = childName || 'your child';

    // Get or refresh snapshot
    const snapshot = await this.getCachedSnapshot(childId, name);

    // Get focus profile from parent bridge
    const focusBridge = getParentFocusBridge();
    const focusProfile = focusBridge.getChildFocusProfile(childId);

    // Get weekly summary
    const weeklySummary = generateWeeklySummary(childId);

    // Get recent activities
    const recentActivities = getRecentProgress(childId, 10);

    // Get existing bridge context (includes avoidance triggers, difficulty, etc.)
    const bridgeContext = buildParentAIContext(childId, 'family'); // default tier

    // Build structured data
    const structuredData: JuniorContextData = {
      childId,
      childName: name,
      snapshot,
      focusProfile,
      weeklySummary,
      recentActivities,
      activeAlerts: snapshot?.patterns || [],
      proactiveAlerts: snapshot?.proactiveAlerts || [],
    };

    // Build proactive suggestions
    const proactiveSuggestions = this.buildProactiveSuggestions(snapshot, focusProfile);

    // Build system prompt section
    const systemPromptSection = this.buildSystemPromptSection(
      name, snapshot, focusProfile, weeklySummary, bridgeContext, proactiveSuggestions,
    );

    const hasData = (snapshot?.totalSessions || 0) > 0 || recentActivities.length > 0;

    return {
      systemPromptSection,
      structuredData,
      proactiveSuggestions,
      hasData,
    };
  }

  // ==========================================================================
  // System Prompt Builder
  // ==========================================================================

  private buildSystemPromptSection(
    childName: string,
    snapshot: SessionSnapshot | null,
    focusProfile: ChildFocusProfile | null,
    weeklySummary: JuniorWeeklySummary | null,
    bridgeContext: string,
    proactiveSuggestions: string[],
  ): string {
    const sections: string[] = [];

    sections.push(`\n--- JUNIOR APP DATA (${childName}) ---`);

    if (!snapshot || snapshot.totalSessions === 0) {
      sections.push(`${childName} hasn't used Junior yet this week. If the parent asks about Junior, you can explain what it offers and encourage trying it.`);
      if (focusProfile) {
        sections.push(getParentFocusBridge().buildAIContextSummary(focusProfile.childId, childName));
      }
      sections.push('--- END JUNIOR DATA ---\n');
      return sections.join('\n');
    }

    // Readable summary
    sections.push(`**Overview:** ${snapshot.readableSummary}`);

    // Domain-by-domain data
    const activeDomains = snapshot.domainStats.filter(s => s.sessions > 0);
    if (activeDomains.length > 0) {
      sections.push('\n**Domain Performance (Last 7 Days):**');
      activeDomains.forEach(stat => {
        const trendLabel = stat.accuracyTrend === 'improving' ? 'trending up' :
          stat.accuracyTrend === 'declining' ? 'trending down' : 'steady';
        const daysSince = stat.daysSinceLastPractice === 0 ? 'today' :
          stat.daysSinceLastPractice === 1 ? 'yesterday' :
          `${stat.daysSinceLastPractice} days ago`;
        sections.push(
          `  - ${formatDomain(stat.domain)}: ${stat.sessions} sessions, ${stat.avgAccuracy}% accuracy (${trendLabel}), Level ${stat.level}, last practiced ${daysSince}`
        );
      });
    }

    // Engagement metrics
    if (snapshot.engagementMetrics) {
      const e = snapshot.engagementMetrics;
      sections.push(`\n**Engagement:** ${e.activitiesPerDay} activities/day, ${Math.round(e.completionRate * 100)}% completion, ${e.currentStreak}-day streak, avg prompt level ${e.avgPromptLevel}, optimal session ~${e.optimalSessionLength} min`);
    }

    // Sensory profile
    if (snapshot.sensoryProfile) {
      const s = snapshot.sensoryProfile;
      sections.push(`**Sensory Profile:** ${s.toleranceLevel} tolerance, effective up to ${s.maxEffectiveMinutes} min${s.frequentCalmCornerUser ? ', frequent calm corner user' : ''}${s.topPreCalmEmotion ? ` (top pre-calm emotion: "${s.topPreCalmEmotion}")` : ''}`);
    }

    // Active patterns/alerts
    const urgentPatterns = snapshot.patterns.filter(p => p.severity === 'urgent' || p.severity === 'warning');
    if (urgentPatterns.length > 0) {
      sections.push('\n**Active Alerts:**');
      urgentPatterns.forEach(p => {
        sections.push(`  - [${p.severity.toUpperCase()}] ${p.title}: ${p.description}`);
      });
    }

    // Focus profile context
    if (focusProfile) {
      sections.push('\n' + getParentFocusBridge().buildAIContextSummary(focusProfile.childId, childName));
    }

    // Existing bridge context (difficulty, avoidance, recommendations)
    if (bridgeContext) {
      sections.push('\n' + bridgeContext);
    }

    // Proactive suggestions for AI to surface
    if (proactiveSuggestions.length > 0) {
      sections.push('\n**Suggestions You Can Offer:**');
      proactiveSuggestions.forEach(s => sections.push(`  - ${s}`));
    }

    // Instructions to AI
    sections.push(`
**Instructions:** When the parent asks about ${childName}'s progress, reference the actual data above.
- For domain-specific questions, cite accuracy %, trends, and session counts.
- When recommending changes, explain WHY based on the data.
- You can suggest difficulty changes, focus area adjustments, and session constraints.
- Use phrases like "Based on Junior data..." or "Looking at this week's sessions..."
- If you notice patterns, proactively share them even if the parent didn't ask.
- Be warm, encouraging, and specific. Celebrate wins before addressing concerns.`);

    sections.push('--- END JUNIOR DATA ---\n');

    return sections.join('\n');
  }

  // ==========================================================================
  // Question Answering
  // ==========================================================================

  /**
   * Generate a structured answer to a Junior-related question.
   * Used by the AI engine to produce data-driven responses.
   */
  async answerJuniorQuestion(
    childId: string,
    childName: string,
    question: string,
  ): Promise<JuniorQuestionAnswer> {
    const snapshot = await this.getCachedSnapshot(childId, childName);

    if (!snapshot || snapshot.totalSessions === 0) {
      return {
        answer: `${childName} hasn't used Junior yet this week, so I don't have session data to reference. Would you like me to suggest some activities to get started?`,
        dataPoints: [],
        followUps: [
          'What activities would you recommend for getting started?',
          'How do I set focus areas for Junior?',
          'What domains does Junior cover?',
        ],
        datadriven: false,
      };
    }

    const questionLower = question.toLowerCase();

    // Detect which domain the parent is asking about
    const askedDomain = this.detectDomainInQuestion(questionLower);

    if (askedDomain) {
      return this.answerDomainQuestion(childName, askedDomain, snapshot);
    }

    // General "how is [child] doing?" question
    if (questionLower.match(/how (?:is|are|was)/)) {
      return this.answerOverallQuestion(childName, snapshot);
    }

    // Weekly report request
    if (questionLower.match(/report|summary|overview|update/)) {
      const report = await this.generateWeeklyReport(childId, childName);
      return {
        answer: report.summary,
        dataPoints: [
          { label: 'Total Sessions', value: String(report.stats.totalSessions) },
          { label: 'Total Minutes', value: String(report.stats.totalMinutes) },
          { label: 'Active Days', value: String(report.stats.activeDays) },
          { label: 'Streak', value: `${report.stats.streak} days` },
          { label: 'Completion Rate', value: `${Math.round(report.stats.completionRate * 100)}%` },
        ],
        followUps: [
          'What should we focus on next week?',
          'Are there any patterns I should be aware of?',
          'How can I help improve their weakest areas?',
        ],
        datadriven: true,
      };
    }

    // Default: provide overview
    return this.answerOverallQuestion(childName, snapshot);
  }

  private answerDomainQuestion(
    childName: string,
    domain: FocusDomain,
    snapshot: SessionSnapshot,
  ): JuniorQuestionAnswer {
    const stat = snapshot.domainStats.find(s => s.domain === domain);

    if (!stat || stat.sessions === 0) {
      return {
        answer: `${childName} hasn't practiced ${formatDomain(domain).toLowerCase()} this week yet. Would you like me to prioritize ${formatDomain(domain).toLowerCase()} activities?`,
        dataPoints: [],
        followUps: [
          `Set ${formatDomain(domain).toLowerCase()} as a focus area`,
          `What ${formatDomain(domain).toLowerCase()} activities are available?`,
          'Show me the overall progress instead',
        ],
        datadriven: false,
      };
    }

    const trendText = stat.accuracyTrend === 'improving'
      ? 'accuracy is trending upward — great momentum!'
      : stat.accuracyTrend === 'declining'
        ? 'accuracy has dipped a bit — we may want to adjust difficulty or try shorter sessions'
        : 'accuracy is holding steady';

    const answer = `${childName} completed ${stat.sessions} ${formatDomain(domain).toLowerCase()} activit${stat.sessions === 1 ? 'y' : 'ies'} this week with ${stat.avgAccuracy}% average accuracy. They're at Level ${stat.level}, and ${trendText}. Average session length was ${Math.round(stat.avgDurationSeconds / 60)} minutes.`;

    return {
      answer,
      dataPoints: [
        { label: 'Sessions', value: String(stat.sessions) },
        { label: 'Accuracy', value: `${stat.avgAccuracy}%` },
        { label: 'Trend', value: stat.accuracyTrend },
        { label: 'Level', value: String(stat.level) },
        { label: 'Last Practiced', value: stat.daysSinceLastPractice === 0 ? 'Today' : `${stat.daysSinceLastPractice} days ago` },
      ],
      followUps: [
        stat.accuracyTrend === 'declining'
          ? `Should we make ${formatDomain(domain).toLowerCase()} easier?`
          : `Should we increase the difficulty for ${formatDomain(domain).toLowerCase()}?`,
        `What specific ${formatDomain(domain).toLowerCase()} activities has ${childName} been doing?`,
        'How does this compare to other domains?',
      ],
      datadriven: true,
    };
  }

  private answerOverallQuestion(
    childName: string,
    snapshot: SessionSnapshot,
  ): JuniorQuestionAnswer {
    const activeDomains = snapshot.domainStats
      .filter(s => s.sessions > 0)
      .sort((a, b) => b.sessions - a.sessions);

    const topDomain = activeDomains[0];
    const weakDomain = activeDomains[activeDomains.length - 1];
    const e = snapshot.engagementMetrics;

    let answer = snapshot.readableSummary;

    // Add engagement context
    if (e.currentStreak >= 3) {
      answer += ` They're on a ${e.currentStreak}-day streak, which is fantastic for building habits.`;
    }

    // Add top pattern alert
    const urgentAlert = snapshot.patterns.find(p => p.severity === 'urgent' || p.severity === 'warning');
    if (urgentAlert) {
      answer += ` One thing to note: ${urgentAlert.description}`;
    }

    const dataPoints = [
      { label: 'This Week', value: `${snapshot.totalSessions} activities, ${snapshot.totalMinutes} min` },
      { label: 'Active Days', value: `${snapshot.activeDays}/7` },
      { label: 'Streak', value: `${e.currentStreak} days` },
    ];

    if (topDomain) {
      dataPoints.push({ label: 'Strongest', value: `${formatDomain(topDomain.domain)} (${topDomain.avgAccuracy}%)` });
    }
    if (weakDomain && weakDomain !== topDomain) {
      dataPoints.push({ label: 'Needs Work', value: `${formatDomain(weakDomain.domain)} (${weakDomain.avgAccuracy}%)` });
    }

    return {
      answer,
      dataPoints,
      followUps: [
        topDomain ? `Tell me more about ${formatDomain(topDomain.domain).toLowerCase()} progress` : 'What activities should we try?',
        'Generate a weekly report',
        urgentAlert ? 'What should I do about that pattern?' : 'Any recommendations for next week?',
      ],
      datadriven: true,
    };
  }

  // ==========================================================================
  // Weekly Report Generation
  // ==========================================================================

  /**
   * Generate a comprehensive weekly report with trends and recommendations.
   */
  async generateWeeklyReport(
    childId: string,
    childName: string,
  ): Promise<WeeklyReport> {
    const snapshot = await this.getCachedSnapshot(childId, childName);
    const weeklySummary = generateWeeklySummary(childId);
    const focusBridge = getParentFocusBridge();
    const focusProfile = focusBridge.getChildFocusProfile(childId);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const period = `${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    if (!snapshot || snapshot.totalSessions === 0) {
      return {
        title: `Weekly Junior Report: ${childName}`,
        period,
        summary: `${childName} didn't have any Junior sessions this week. Even short, consistent practice — just 5 minutes a day — can make a meaningful difference. Let's set a small goal for next week!`,
        domainSections: [],
        highlights: [],
        concerns: ['No practice sessions this week'],
        recommendations: [
          'Start with one 5-minute session per day',
          'Begin with preferred activities to build momentum',
          'Try using the calm corner before practice to get focused',
        ],
        stats: {
          totalSessions: 0,
          totalMinutes: 0,
          activeDays: 0,
          streak: 0,
          completionRate: 0,
        },
      };
    }

    // Domain sections
    const domainSections = snapshot.domainStats.map(stat => {
      let status: 'great' | 'good' | 'needs_attention' | 'no_data' = 'no_data';
      let detail = '';

      if (stat.sessions === 0) {
        status = 'no_data';
        detail = `No ${formatDomain(stat.domain).toLowerCase()} practice this week.`;
      } else if (stat.avgAccuracy >= 80 && stat.accuracyTrend !== 'declining') {
        status = 'great';
        detail = `Excellent performance with ${stat.avgAccuracy}% accuracy across ${stat.sessions} sessions. ${stat.accuracyTrend === 'improving' ? 'Still improving!' : 'Consistent and strong.'}`;
      } else if (stat.avgAccuracy >= 60) {
        status = 'good';
        detail = `Solid progress at ${stat.avgAccuracy}% accuracy. ${stat.accuracyTrend === 'improving' ? 'Trending in the right direction.' : stat.accuracyTrend === 'declining' ? 'Slight dip — consider adjusting difficulty.' : 'Holding steady.'}`;
      } else {
        status = 'needs_attention';
        detail = `${stat.avgAccuracy}% accuracy suggests this may be too challenging right now. Consider lowering the difficulty or adding more support.`;
      }

      return {
        domain: formatDomain(stat.domain),
        status,
        accuracy: stat.avgAccuracy,
        sessions: stat.sessions,
        trend: stat.accuracyTrend,
        detail,
      };
    }).filter(s => s.sessions > 0 || s.status === 'no_data');

    // Highlights
    const highlights: string[] = [];
    if (snapshot.engagementMetrics.currentStreak >= 3) {
      highlights.push(`${snapshot.engagementMetrics.currentStreak}-day practice streak!`);
    }
    snapshot.domainStats
      .filter(s => s.avgAccuracy >= 85 && s.sessions >= 3)
      .forEach(s => highlights.push(`${formatDomain(s.domain)} accuracy at ${s.avgAccuracy}%`));
    snapshot.domainStats
      .filter(s => s.accuracyTrend === 'improving' && s.sessions >= 3)
      .forEach(s => highlights.push(`${formatDomain(s.domain)} skills trending upward`));

    if (weeklySummary) {
      highlights.push(...weeklySummary.highlights.slice(0, 3));
    }

    // Concerns
    const concerns: string[] = [];
    snapshot.patterns
      .filter(p => p.severity === 'warning' || p.severity === 'urgent')
      .forEach(p => concerns.push(p.title));
    if (weeklySummary) {
      concerns.push(...weeklySummary.concerns.slice(0, 3));
    }

    // Recommendations
    const recommendations: string[] = [];
    snapshot.proactiveAlerts
      .filter(a => a.priority === 'high' || a.priority === 'medium')
      .slice(0, 4)
      .forEach(a => recommendations.push(a.message));

    // Add focus-area-based recommendations
    const focusAreas = getFocusAreas(childId);
    focusAreas.forEach(area => {
      const stat = snapshot.domainStats.find(s => s.domain === area.domain);
      if (stat && stat.sessions < 3) {
        recommendations.push(`Increase ${formatDomain(area.domain).toLowerCase()} practice — it's a focus area but only had ${stat.sessions} session${stat.sessions === 1 ? '' : 's'} this week.`);
      }
    });

    // Summary paragraph
    const summaryParts: string[] = [];
    summaryParts.push(`${childName} completed ${snapshot.totalSessions} activities across ${snapshot.activeDays} days this week, totaling ${snapshot.totalMinutes} minutes of practice.`);

    if (highlights.length > 0) {
      summaryParts.push(`Wins: ${highlights.slice(0, 2).join(', ')}.`);
    }
    if (concerns.length > 0) {
      summaryParts.push(`Areas to watch: ${concerns.slice(0, 2).join(', ')}.`);
    }
    if (recommendations.length > 0) {
      summaryParts.push(`Top recommendation: ${recommendations[0]}`);
    }

    return {
      title: `Weekly Junior Report: ${childName}`,
      period,
      summary: summaryParts.join(' '),
      domainSections,
      highlights: [...new Set(highlights)].slice(0, 5),
      concerns: [...new Set(concerns)].slice(0, 5),
      recommendations: [...new Set(recommendations)].slice(0, 5),
      stats: {
        totalSessions: snapshot.totalSessions,
        totalMinutes: snapshot.totalMinutes,
        activeDays: snapshot.activeDays,
        streak: snapshot.engagementMetrics.currentStreak,
        completionRate: snapshot.engagementMetrics.completionRate,
      },
    };
  }

  // ==========================================================================
  // Proactive Suggestions
  // ==========================================================================

  private buildProactiveSuggestions(
    snapshot: SessionSnapshot | null,
    focusProfile: ChildFocusProfile | null,
  ): string[] {
    const suggestions: string[] = [];

    if (!snapshot) return suggestions;

    // From proactive alerts
    snapshot.proactiveAlerts
      .filter(a => a.priority === 'high' || a.priority === 'medium')
      .slice(0, 3)
      .forEach(a => suggestions.push(a.message));

    // From patterns
    snapshot.patterns
      .filter(p => p.severity === 'warning' || p.severity === 'urgent')
      .slice(0, 2)
      .forEach(p => suggestions.push(`${p.title}: ${p.suggestedAction}`));

    // Difficulty-based suggestions
    if (focusProfile?.difficultyCeiling) {
      suggestions.push(
        `Difficulty ceiling is set to Level ${focusProfile.difficultyCeiling.maxLevel} (${focusProfile.difficultyCeiling.reason}). Consider reviewing this when things settle.`
      );
    }

    // Sensory-based suggestions
    if (snapshot.sensoryProfile.toleranceLevel === 'low') {
      suggestions.push(
        `Based on session patterns, enabling Sensory Mode might help — shorter sessions with reduced stimulation.`
      );
    }

    return suggestions;
  }

  /**
   * Get proactive suggestions ready for the AI to surface.
   * Call this when the parent opens Ask Aminy — the AI can lead with these.
   */
  async getProactiveSuggestions(
    childId: string,
    childName: string,
  ): Promise<string[]> {
    const snapshot = await this.getCachedSnapshot(childId, childName);
    const focusProfile = getParentFocusBridge().getChildFocusProfile(childId);
    return this.buildProactiveSuggestions(snapshot, focusProfile);
  }

  // ==========================================================================
  // Intent Detection
  // ==========================================================================

  /**
   * Detect whether a user message is asking about Junior / child progress.
   * Used by the conversation engine to decide whether to inject Junior context.
   */
  detectJuniorIntent(userMessage: string): {
    isJuniorRelated: boolean;
    confidence: number;
    detectedDomain: FocusDomain | null;
  } {
    const lower = userMessage.toLowerCase();
    let score = 0;

    // Keyword matching
    JUNIOR_INTENT_KEYWORDS.forEach(keyword => {
      if (lower.includes(keyword)) score += 1;
    });

    // Pattern matching
    JUNIOR_QUESTION_PATTERNS.forEach(pattern => {
      if (pattern.test(lower)) score += 3;
    });

    // Detect specific domain
    const detectedDomain = this.detectDomainInQuestion(lower);
    if (detectedDomain) score += 2;

    const confidence = Math.min(score / 5, 1.0);

    return {
      isJuniorRelated: confidence >= 0.3,
      confidence,
      detectedDomain,
    };
  }

  private detectDomainInQuestion(questionLower: string): FocusDomain | null {
    const domainKeywords: Record<FocusDomain, string[]> = {
      speech: ['speech', 'articulation', 'phoneme', 'pronunciation', 'talking', 'language', 'vocabulary', 'narrative', 'sentence', 'word', 'sounds', 'r sound', 's sound', 'consonant', 'vowel'],
      social: ['social', 'friend', 'conversation', 'turn-taking', 'sharing', 'empathy', 'perspective', 'compliment', 'conflict', 'peer'],
      regulation: ['calm', 'regulation', 'meltdown', 'emotion', 'feeling', 'frustrat', 'anxious', 'angry', 'overwhelm', 'sensory break'],
      routines: ['routine', 'schedule', 'morning', 'bedtime', 'transition', 'daily'],
      sensory: ['sensory', 'texture', 'sound', 'movement', 'vestibular', 'proprioceptive', 'tactile', 'noise'],
      executive: ['executive', 'planning', 'memory', 'attention', 'focus', 'sequencing', 'task', 'organization', 'time management'],
      aac: ['aac', 'augmentative', 'communication device', 'core words', 'symbol'],
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      for (const keyword of keywords) {
        if (questionLower.includes(keyword)) {
          return domain as FocusDomain;
        }
      }
    }

    return null;
  }

  // ==========================================================================
  // Caching
  // ==========================================================================

  private async getCachedSnapshot(childId: string, childName?: string): Promise<SessionSnapshot | null> {
    const cached = this.snapshotCache.get(childId);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
      return cached.snapshot;
    }

    try {
      const snapshot = await collectJuniorSnapshot(childId, childName);
      this.snapshotCache.set(childId, { snapshot, cachedAt: Date.now() });
      return snapshot;
    } catch (err) {
      console.warn('[AIJuniorContext] Snapshot fetch failed:', err);
      return cached?.snapshot || null;
    }
  }

  /**
   * Force refresh the cached snapshot for a child.
   */
  invalidateCache(childId: string): void {
    this.snapshotCache.delete(childId);
  }
}

// ============================================================================
// Helpers
// ============================================================================

function formatDomain(domain: string): string {
  return domain
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================================================
// Singleton & Convenience
// ============================================================================

let _provider: AIJuniorContextProvider | null = null;

export function getAIJuniorContext(): AIJuniorContextProvider {
  if (!_provider) _provider = new AIJuniorContextProvider();
  return _provider;
}

/**
 * Quick helper: build conversation context for Ask Aminy.
 */
export async function buildJuniorAIContext(
  userId: string,
  childId: string,
  childName?: string,
): Promise<JuniorAIContext> {
  return getAIJuniorContext().buildConversationContext(userId, childId, childName);
}

/**
 * Quick helper: detect if a message is Junior-related.
 */
export function isJuniorRelatedMessage(message: string): boolean {
  return getAIJuniorContext().detectJuniorIntent(message).isJuniorRelated;
}

export default AIJuniorContextProvider;
