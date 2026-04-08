// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AI Care Plan Generator
 *
 * Generates personalized care plans from conversation history, child profile,
 * behavior data, and Junior progress. Output matches the existing care-plan.ts
 * data structures (CarePlanGoal, ActionItem, VisitSummary).
 *
 * This is distinct from:
 *   - care-plan.ts — CRUD operations for care plan data
 *   - ai-engine/rich-context.ts — context aggregation for AI prompts
 *
 * This module handles AI-DRIVEN PLAN GENERATION:
 *   - generateCarePlan() — full care plan from child profile + conversation history
 *   - generateActionItems() — specific weekly action items from recent context
 *   - generateGoalSuggestions() — new goal recommendations based on progress
 *   - generateProviderDiscussionTopics() — talking points for next therapy visit
 *
 * Uses conversation history, ABC entries, Junior progress, and child profile
 * to create actionable, evidence-informed recommendations.
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { GoalCategory } from './care-plan';

// ============================================================================
// Types
// ============================================================================

export interface GeneratedCarePlan {
  childId: string;
  childName: string;
  generatedAt: string;
  summary: string;
  dailyRoutineItems: DailyRoutineItem[];
  weeklyGoals: WeeklyGoal[];
  recommendedActivities: RecommendedActivity[];
  providerDiscussionTopics: DiscussionTopic[];
  selfCareRecommendations: string[];
}

export interface DailyRoutineItem {
  time: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  activity: string;
  strategy: string;
  duration?: string;
  rationale: string;
}

export interface WeeklyGoal {
  title: string;
  description: string;
  category: GoalCategory;
  targetFrequency: string;
  targetProgress: number;
  measurable: string;
  priority: 'low' | 'medium' | 'high';
}

export interface RecommendedActivity {
  title: string;
  description: string;
  skillDomain: string;
  duration: string;
  materials?: string[];
  juniorActivityId?: string; // Link to Junior activity if applicable
}

export interface DiscussionTopic {
  topic: string;
  context: string;
  priority: 'low' | 'medium' | 'high';
  suggestedQuestions: string[];
}

// Internal type for aggregated context
interface ChildContext {
  childId: string;
  childName: string;
  age?: number;
  diagnosisInfo?: string;
  sensoryProfile?: string;
  recentBehaviors: string[];
  recentConversationTopics: string[];
  currentGoals: string[];
  juniorProgress: string[];
  therapyTypes: string[];
}

// ============================================================================
// AI Care Plan Generator Class
// ============================================================================

export class AICareplanGenerator {
  private backendUrl: string;

  constructor() {
    this.backendUrl = `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;
  }

  // ==========================================================================
  // Main Generation
  // ==========================================================================

  /**
   * Generate a full care plan for a child.
   * Aggregates all available data and uses AI for personalized recommendations.
   */
  async generateCarePlan(
    userId: string,
    childId: string
  ): Promise<GeneratedCarePlan> {
    // 1. Gather context
    const context = await this.gatherChildContext(userId, childId);

    // 2. Try AI-powered generation
    try {
      return await this.generateWithAI(context);
    } catch (err) {
      console.warn('[AICareplanGenerator] AI generation failed, using heuristic:', err);
    }

    // 3. Fallback to heuristic generation
    return this.generateHeuristic(context);
  }

  /**
   * Generate just the weekly action items (lighter than full care plan).
   */
  async generateActionItems(
    userId: string,
    childId: string,
    count: number = 5
  ): Promise<WeeklyGoal[]> {
    const context = await this.gatherChildContext(userId, childId);

    // Heuristic action items based on recent data
    const goals: WeeklyGoal[] = [];

    // From behavior patterns
    if (context.recentBehaviors.length > 0) {
      const commonBehavior = context.recentBehaviors[0];
      goals.push({
        title: `Address ${commonBehavior} patterns`,
        description: `Work on proactive strategies for ${commonBehavior} situations. Use visual supports and pre-transition warnings.`,
        category: 'behavior',
        targetFrequency: 'Daily practice',
        targetProgress: 100,
        measurable: 'Track incidents and compare week-over-week',
        priority: 'high',
      });
    }

    // From Junior progress
    if (context.juniorProgress.length > 0) {
      goals.push({
        title: 'Continue Ease practice sessions',
        description: `Build on current progress with 2-3 short sessions per day. Focus on areas showing improvement.`,
        category: 'communication',
        targetFrequency: '3x daily, 5 min each',
        targetProgress: 100,
        measurable: 'Complete at least 15 Ease sessions this week',
        priority: 'medium',
      });
    }

    // Standard recommendations based on conversation topics
    for (const topic of context.recentConversationTopics.slice(0, 3)) {
      const goalData = this.topicToGoal(topic);
      if (goalData && goals.length < count) {
        goals.push(goalData);
      }
    }

    // Self-care goal (always include)
    if (goals.length < count) {
      goals.push({
        title: 'Caregiver self-care check-in',
        description: 'Take 10 minutes each day for yourself — deep breathing, a walk, journaling, or anything that recharges you.',
        category: 'self-care',
        targetFrequency: 'Daily, 10 min',
        targetProgress: 7,
        measurable: 'Complete self-care activity on 5 of 7 days',
        priority: 'medium',
      });
    }

    return goals.slice(0, count);
  }

  /**
   * Generate goal suggestions based on current progress and gaps.
   */
  async generateGoalSuggestions(
    userId: string,
    childId: string
  ): Promise<WeeklyGoal[]> {
    // Fetch current active goals to avoid duplication
    const { data: activeGoals } = await supabase
      .from('care_plan_goals')
      .select('category, title')
      .eq('user_id', userId)
      .eq('status', 'active');

    const activeCategories = new Set(
      (activeGoals || []).map(g => g.category)
    );

    const context = await this.gatherChildContext(userId, childId);
    const suggestions: WeeklyGoal[] = [];

    // Suggest goals for uncovered categories
    const allCategories: GoalCategory[] = [
      'daily-routine', 'communication', 'sensory', 'social',
      'self-care', 'behavior', 'academic', 'motor',
    ];

    for (const category of allCategories) {
      if (activeCategories.has(category)) continue;
      if (suggestions.length >= 3) break;

      const goal = this.suggestGoalForCategory(category, context);
      if (goal) suggestions.push(goal);
    }

    return suggestions;
  }

  /**
   * Generate discussion topics for the next provider visit.
   */
  async generateProviderDiscussionTopics(
    userId: string,
    childId: string
  ): Promise<DiscussionTopic[]> {
    const context = await this.gatherChildContext(userId, childId);
    const topics: DiscussionTopic[] = [];

    // Behavior concerns
    if (context.recentBehaviors.length > 0) {
      topics.push({
        topic: 'Recent behavior patterns',
        context: `${context.recentBehaviors.join(', ')} have been noted in the last 2 weeks.`,
        priority: 'high',
        suggestedQuestions: [
          'Are these behaviors within expected range for their developmental stage?',
          'Should we adjust our current behavior intervention plan?',
          'Are there environmental modifications we should consider?',
        ],
      });
    }

    // Progress updates
    if (context.juniorProgress.length > 0) {
      topics.push({
        topic: 'Skill development progress',
        context: `Home practice via Junior app: ${context.juniorProgress.join(', ')}`,
        priority: 'medium',
        suggestedQuestions: [
          'Is the home practice aligned with current therapy goals?',
          'Should we adjust the difficulty level or focus areas?',
          'Are there new skills we should start working on?',
        ],
      });
    }

    // Current goals review
    if (context.currentGoals.length > 0) {
      topics.push({
        topic: 'Goal review',
        context: `Active goals: ${context.currentGoals.join(', ')}`,
        priority: 'medium',
        suggestedQuestions: [
          'Are current goals still appropriate or should we update them?',
          'What does the data show about progress toward these goals?',
          'Should we add new goals or modify existing ones?',
        ],
      });
    }

    // Conversation-driven topics
    for (const topic of context.recentConversationTopics) {
      if (topics.length >= 5) break;

      const discussionTopic = this.conversationTopicToDiscussion(topic, context);
      if (discussionTopic) topics.push(discussionTopic);
    }

    // Always suggest asking about caregiver support
    topics.push({
      topic: 'Caregiver support resources',
      context: 'Regular check-in about family support needs.',
      priority: 'low',
      suggestedQuestions: [
        'Are there parent training programs you would recommend?',
        'Are there respite care options we should explore?',
        'Is our current level of support sufficient for our family\'s needs?',
      ],
    });

    return topics;
  }

  // ==========================================================================
  // Context Gathering
  // ==========================================================================

  private async gatherChildContext(
    userId: string,
    childId: string
  ): Promise<ChildContext> {
    const context: ChildContext = {
      childId,
      childName: 'your child',
      recentBehaviors: [],
      recentConversationTopics: [],
      currentGoals: [],
      juniorProgress: [],
      therapyTypes: [],
    };

    try {
      // Parallel fetches for all context
      const [childData, behaviorData, goalData, conversationData, difficultyData] =
        await Promise.allSettled([
          // Child profile
          supabase.from('children').select('*').eq('id', childId).single(),
          // Recent ABC entries
          supabase.from('abc_entries')
            .select('behavior_category, antecedent_category')
            .eq('child_id', childId)
            .gte('occurred_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
            .order('occurred_at', { ascending: false })
            .limit(20),
          // Active goals
          supabase.from('care_plan_goals')
            .select('title, category')
            .eq('user_id', userId)
            .eq('status', 'active'),
          // Recent conversation topics
          supabase.from('conversations')
            .select('topics')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5),
          // Junior progress
          supabase.from('adaptive_difficulty')
            .select('skill_domain, rolling_accuracy, current_level')
            .eq('child_id', childId),
        ]);

      // Process child data
      if (childData.status === 'fulfilled' && childData.value.data) {
        const child = childData.value.data;
        context.childName = child.first_name || child.name || 'your child';
        context.age = child.age || child.date_of_birth
          ? calculateAge(child.date_of_birth)
          : undefined;
        context.diagnosisInfo = child.diagnosis || child.diagnoses?.join(', ');
        context.sensoryProfile = child.sensory_profile;
      }

      // Process behavior data
      if (behaviorData.status === 'fulfilled' && behaviorData.value.data) {
        const behaviorCounts: Record<string, number> = {};
        for (const entry of behaviorData.value.data) {
          if (entry.behavior_category) {
            behaviorCounts[entry.behavior_category] =
              (behaviorCounts[entry.behavior_category] || 0) + 1;
          }
        }
        context.recentBehaviors = Object.entries(behaviorCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([behavior]) => behavior);
      }

      // Process goals
      if (goalData.status === 'fulfilled' && goalData.value.data) {
        context.currentGoals = goalData.value.data.map(g => g.title);
      }

      // Process conversation topics
      if (conversationData.status === 'fulfilled' && conversationData.value.data) {
        const allTopics = conversationData.value.data
          .flatMap(c => (c.topics as string[]) || []);
        context.recentConversationTopics = [...new Set(allTopics)].slice(0, 10);
      }

      // Process Junior progress
      if (difficultyData.status === 'fulfilled' && difficultyData.value.data) {
        context.juniorProgress = difficultyData.value.data.map(d =>
          `${d.skill_domain}: Level ${d.current_level}, ${Math.round((d.rolling_accuracy || 0) * 100)}% accuracy`
        );
      }

    } catch (err) {
      console.error('[AICareplanGenerator] Context gathering error:', err);
    }

    return context;
  }

  // ==========================================================================
  // AI-Powered Generation
  // ==========================================================================

  private async generateWithAI(context: ChildContext): Promise<GeneratedCarePlan> {
    const prompt = this.buildAIPrompt(context);

    const response = await fetch(`${this.backendUrl}/ai/care-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are a clinical care planning assistant for families of neurodivergent children. Generate evidence-informed, practical care plan recommendations. Be warm, specific, and actionable. Return structured JSON.`,
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI care plan generation failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.message || data.content || data.summary || '';

    // Parse JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI care plan response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return this.parseAICarePlan(parsed, context);
  }

  private buildAIPrompt(context: ChildContext): string {
    const parts = [
      `Generate a personalized weekly care plan for ${context.childName}.`,
    ];

    if (context.age) parts.push(`Age: ${context.age}`);
    if (context.diagnosisInfo) parts.push(`Diagnosis: ${context.diagnosisInfo}`);
    if (context.sensoryProfile) parts.push(`Sensory profile: ${context.sensoryProfile}`);
    if (context.recentBehaviors.length > 0) {
      parts.push(`Recent behavior concerns: ${context.recentBehaviors.join(', ')}`);
    }
    if (context.currentGoals.length > 0) {
      parts.push(`Current active goals: ${context.currentGoals.join(', ')}`);
    }
    if (context.juniorProgress.length > 0) {
      parts.push(`Ease progress: ${context.juniorProgress.join('; ')}`);
    }
    if (context.recentConversationTopics.length > 0) {
      parts.push(`Recent topics discussed: ${context.recentConversationTopics.join(', ')}`);
    }

    parts.push(`
Return JSON with this shape:
{
  "summary": "2-3 sentence care plan summary",
  "dailyRoutine": [{"time": "morning|afternoon|evening|bedtime", "activity": "string", "strategy": "string", "duration": "string", "rationale": "string"}],
  "weeklyGoals": [{"title": "string", "description": "string", "category": "string", "frequency": "string", "measurable": "string"}],
  "activities": [{"title": "string", "description": "string", "domain": "string", "duration": "string", "materials": ["string"]}],
  "selfCare": ["string"]
}`);

    return parts.join('\n');
  }

  private parseAICarePlan(
    parsed: Record<string, unknown>,
    context: ChildContext
  ): GeneratedCarePlan {
    return {
      childId: context.childId,
      childName: context.childName,
      generatedAt: new Date().toISOString(),
      summary: (parsed.summary as string) || `Personalized care plan for ${context.childName}.`,
      dailyRoutineItems: ((parsed.dailyRoutine || []) as Record<string, unknown>[]).map(r => ({
        time: (r.time || 'morning') as DailyRoutineItem['time'],
        activity: (r.activity || '') as string,
        strategy: (r.strategy || '') as string,
        duration: r.duration as string | undefined,
        rationale: (r.rationale || '') as string,
      })),
      weeklyGoals: ((parsed.weeklyGoals || []) as Record<string, unknown>[]).map(g => ({
        title: (g.title || '') as string,
        description: (g.description || '') as string,
        category: (g.category || 'other') as GoalCategory,
        targetFrequency: (g.frequency || 'Daily') as string,
        targetProgress: 100,
        measurable: (g.measurable || '') as string,
        priority: 'medium' as const,
      })),
      recommendedActivities: ((parsed.activities || []) as Record<string, unknown>[]).map(a => ({
        title: (a.title || '') as string,
        description: (a.description || '') as string,
        skillDomain: (a.domain || '') as string,
        duration: (a.duration || '5-10 min') as string,
        materials: a.materials as string[] | undefined,
      })),
      providerDiscussionTopics: [], // Generated separately via generateProviderDiscussionTopics
      selfCareRecommendations: (parsed.selfCare || []) as string[],
    };
  }

  // ==========================================================================
  // Heuristic Generation (Fallback)
  // ==========================================================================

  private generateHeuristic(context: ChildContext): GeneratedCarePlan {
    const dailyRoutine: DailyRoutineItem[] = [
      {
        time: 'morning',
        activity: 'Visual schedule review',
        strategy: 'Go through the day\'s schedule together using pictures or a whiteboard. Let them check off each item as it\'s completed.',
        duration: '5 min',
        rationale: 'Visual schedules reduce anxiety by making the day predictable.',
      },
      {
        time: 'afternoon',
        activity: 'Sensory break',
        strategy: 'Offer a 10-minute sensory activity — swinging, trampoline, deep pressure, or quiet time with headphones.',
        duration: '10 min',
        rationale: 'Afternoon sensory breaks prevent overwhelm and support regulation for the rest of the day.',
      },
      {
        time: 'evening',
        activity: 'Calm-down routine',
        strategy: 'Start wind-down 30 minutes before bedtime. Dim lights, reduce screens, offer calming activities like reading or gentle music.',
        duration: '30 min',
        rationale: 'Consistent evening routines support better sleep and reduce bedtime resistance.',
      },
    ];

    // Add behavior-specific routine items
    if (context.recentBehaviors.includes('meltdown') || context.recentBehaviors.includes('tantrum')) {
      dailyRoutine.push({
        time: 'morning',
        activity: 'Transition preparation',
        strategy: 'Use a timer and verbal countdown (5 min, 2 min, 1 min) before any activity changes. Pair with a visual timer they can see.',
        duration: '2-3 min per transition',
        rationale: 'Transitions are a top trigger — preparation reduces surprise and frustration.',
      });
    }

    const weeklyGoals: WeeklyGoal[] = [];

    // Add behavior-targeted goals
    for (const behavior of context.recentBehaviors.slice(0, 2)) {
      const goal = this.behaviorToGoal(behavior, context);
      if (goal) weeklyGoals.push(goal);
    }

    // Add conversation-topic goals
    for (const topic of context.recentConversationTopics.slice(0, 2)) {
      const goal = this.topicToGoal(topic);
      if (goal) weeklyGoals.push(goal);
    }

    // Add self-care goal
    weeklyGoals.push({
      title: 'Daily caregiver reset',
      description: 'Take 10 minutes of uninterrupted time for yourself each day.',
      category: 'self-care',
      targetFrequency: 'Daily',
      targetProgress: 7,
      measurable: 'Complete on at least 5 of 7 days',
      priority: 'medium',
    });

    const recommendedActivities: RecommendedActivity[] = [];

    // Map Junior progress to activities
    for (const progress of context.juniorProgress.slice(0, 3)) {
      const domain = progress.split(':')[0]?.trim();
      if (domain) {
        recommendedActivities.push({
          title: `${formatDomain(domain)} practice`,
          description: `Continue building ${formatDomain(domain).toLowerCase()} skills with short, fun practice sessions.`,
          skillDomain: domain,
          duration: '5-10 min',
        });
      }
    }

    // Default activities if none from Junior
    if (recommendedActivities.length === 0) {
      recommendedActivities.push(
        {
          title: 'Social story time',
          description: 'Read or create a social story about an upcoming event or challenging situation.',
          skillDomain: 'social',
          duration: '10 min',
          materials: ['Social story book or printed story', 'Markers for drawing'],
        },
        {
          title: 'Sensory exploration',
          description: 'Set up a sensory bin with rice, beans, or water beads. Add scoops, cups, and small toys.',
          skillDomain: 'sensory',
          duration: '15-20 min',
          materials: ['Plastic bin', 'Rice or beans', 'Scoops and cups'],
        }
      );
    }

    return {
      childId: context.childId,
      childName: context.childName,
      generatedAt: new Date().toISOString(),
      summary: `This week's focus for ${context.childName}: ${context.recentBehaviors.length > 0
        ? `address ${context.recentBehaviors[0]} patterns with proactive strategies`
        : 'maintain consistent routines and build on current progress'
      }. ${context.juniorProgress.length > 0 ? 'Continue Ease sessions to reinforce calm, motivation, and skill carryover.' : 'Consider starting Ease for calm support, rewards, transitions, and structured practice.'}`,
      dailyRoutineItems: dailyRoutine,
      weeklyGoals,
      recommendedActivities,
      providerDiscussionTopics: [],
      selfCareRecommendations: [
        'Take 10 minutes for yourself each day — you deserve it.',
        'Connect with another parent who understands your journey.',
        'Celebrate one small win each day, even if it feels tiny.',
        'Remember: progress isn\'t always linear, and that\'s okay.',
      ],
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private behaviorToGoal(behavior: string, context: ChildContext): WeeklyGoal | null {
    const behaviorGoals: Record<string, WeeklyGoal> = {
      meltdown: {
        title: 'Reduce meltdown frequency',
        description: `Use proactive strategies (visual schedules, transition warnings, sensory breaks) to prevent meltdowns. Track frequency and triggers.`,
        category: 'behavior',
        targetFrequency: 'Daily tracking',
        targetProgress: 100,
        measurable: 'Reduce meltdown count by 20% from last week',
        priority: 'high',
      },
      aggression: {
        title: 'Practice safe hands',
        description: `Teach and reinforce "gentle hands" with role-play and social stories. Use redirection to replacement behaviors.`,
        category: 'behavior',
        targetFrequency: 'Daily practice + as-needed',
        targetProgress: 100,
        measurable: 'Log incidents and compare week-over-week',
        priority: 'high',
      },
      elopement: {
        title: 'Safety and staying together',
        description: `Practice "stop and wait" drills in safe environments. Use visual boundary markers and social stories about staying close.`,
        category: 'behavior',
        targetFrequency: '3x weekly practice',
        targetProgress: 100,
        measurable: 'Successful "stop and wait" responses during practice',
        priority: 'high',
      },
      refusal: {
        title: 'Build cooperation with choices',
        description: `Offer 2-3 acceptable choices instead of open demands. Use "first-then" boards and natural motivators.`,
        category: 'behavior',
        targetFrequency: 'Daily, at transition points',
        targetProgress: 100,
        measurable: 'Track successful cooperation moments',
        priority: 'medium',
      },
      shutdown: {
        title: 'Create safe recovery spaces',
        description: `Ensure a designated calm-down space is available. Reduce verbal demands during shutdown. Allow recovery time.`,
        category: 'sensory',
        targetFrequency: 'As needed + daily practice',
        targetProgress: 100,
        measurable: 'Recovery time decreases over the week',
        priority: 'medium',
      },
    };

    return behaviorGoals[behavior] || null;
  }

  private topicToGoal(topic: string): WeeklyGoal | null {
    const topicGoals: Record<string, WeeklyGoal> = {
      sleep: {
        title: 'Improve bedtime routine',
        description: 'Establish a consistent 30-minute wind-down routine. Same order, same time each night.',
        category: 'daily-routine',
        targetFrequency: 'Every night',
        targetProgress: 7,
        measurable: 'Follow routine on 5+ nights this week',
        priority: 'high',
      },
      communication: {
        title: 'Practice communication daily',
        description: 'Spend 5-10 minutes on targeted communication practice using the child\'s preferred modality.',
        category: 'communication',
        targetFrequency: 'Daily, 5-10 min',
        targetProgress: 7,
        measurable: 'Complete practice on 5+ days',
        priority: 'medium',
      },
      sensory: {
        title: 'Proactive sensory diet',
        description: 'Offer scheduled sensory breaks throughout the day, not just when overwhelm hits.',
        category: 'sensory',
        targetFrequency: '3x daily',
        targetProgress: 21,
        measurable: 'Provide 3 sensory breaks daily for 7 days',
        priority: 'medium',
      },
      social: {
        title: 'Social practice opportunities',
        description: 'Create 2-3 structured social interactions per week (playdate, parallel play, social story practice).',
        category: 'social',
        targetFrequency: '2-3x weekly',
        targetProgress: 3,
        measurable: 'Complete 2+ social practice sessions this week',
        priority: 'medium',
      },
      feeding: {
        title: 'Mealtime exploration',
        description: 'Introduce one new food exposure per week (touch, smell, lick — no pressure to eat). Keep preferred foods available.',
        category: 'self-care',
        targetFrequency: '3x weekly at meals',
        targetProgress: 3,
        measurable: 'Offer new food exposure 3 times this week',
        priority: 'low',
      },
      anxiety: {
        title: 'Build coping toolkit',
        description: 'Practice one calming strategy per day (deep breathing, counting, squeeze ball). Use when calm first, then in mild stress.',
        category: 'behavior',
        targetFrequency: 'Daily practice',
        targetProgress: 7,
        measurable: 'Practice calming strategy daily for 7 days',
        priority: 'high',
      },
      school: {
        title: 'School communication log',
        description: 'Keep a brief daily log of school feedback. Note positives and challenges to share with provider.',
        category: 'academic',
        targetFrequency: 'Daily',
        targetProgress: 5,
        measurable: 'Log 5 school days this week',
        priority: 'medium',
      },
    };

    return topicGoals[topic] || null;
  }

  private suggestGoalForCategory(
    category: GoalCategory,
    _context: ChildContext
  ): WeeklyGoal | null {
    const defaults: Record<GoalCategory, WeeklyGoal | null> = {
      'daily-routine': {
        title: 'Morning routine independence',
        description: 'Use a visual checklist for the morning routine. Gradually fade prompts as independence builds.',
        category: 'daily-routine',
        targetFrequency: 'Every morning',
        targetProgress: 7,
        measurable: 'Complete morning routine with checklist 5+ days',
        priority: 'medium',
      },
      communication: {
        title: 'Expand communication',
        description: 'Practice requesting with 2+ word combinations or supported communication tool.',
        category: 'communication',
        targetFrequency: 'Daily, 5 min',
        targetProgress: 7,
        measurable: 'Daily communication practice for 7 days',
        priority: 'medium',
      },
      sensory: {
        title: 'Sensory regulation toolkit',
        description: 'Build a portable sensory kit and practice using it proactively.',
        category: 'sensory',
        targetFrequency: '3x daily',
        targetProgress: 21,
        measurable: '3 proactive sensory breaks daily for 7 days',
        priority: 'medium',
      },
      social: {
        title: 'Peer interaction practice',
        description: 'Set up one structured social activity per week with a peer.',
        category: 'social',
        targetFrequency: 'Weekly',
        targetProgress: 1,
        measurable: 'Complete 1 peer interaction this week',
        priority: 'low',
      },
      'self-care': {
        title: 'Caregiver wellness',
        description: 'Prioritize 10 minutes of self-care daily.',
        category: 'self-care',
        targetFrequency: 'Daily',
        targetProgress: 7,
        measurable: '5+ days of self-care this week',
        priority: 'medium',
      },
      behavior: {
        title: 'Positive reinforcement tracking',
        description: 'Catch and celebrate 3 positive behaviors per day. Use specific praise.',
        category: 'behavior',
        targetFrequency: '3x daily',
        targetProgress: 21,
        measurable: '3 positive reinforcements daily for 7 days',
        priority: 'medium',
      },
      academic: {
        title: 'Learning readiness routine',
        description: 'Create a pre-learning routine with sensory regulation to support focus.',
        category: 'academic',
        targetFrequency: 'Before learning activities',
        targetProgress: 5,
        measurable: 'Use pre-learning routine 5+ times this week',
        priority: 'low',
      },
      motor: {
        title: 'Fine motor practice',
        description: 'Include fine motor activities (playdough, cutting, beading) in daily play.',
        category: 'motor',
        targetFrequency: 'Daily, 10 min',
        targetProgress: 7,
        measurable: 'Fine motor activity on 5+ days this week',
        priority: 'low',
      },
      other: null,
    };

    return defaults[category] || null;
  }

  private conversationTopicToDiscussion(
    topic: string,
    _context: ChildContext
  ): DiscussionTopic | null {
    const topicDiscussions: Record<string, DiscussionTopic> = {
      medication: {
        topic: 'Medication review',
        context: 'Medication was discussed in recent conversations.',
        priority: 'high',
        suggestedQuestions: [
          'Should we adjust the current dosage or timing?',
          'Are there any side effects we should be monitoring?',
          'How long before we can evaluate effectiveness?',
        ],
      },
      therapy: {
        topic: 'Therapy coordination',
        context: 'Therapy-related topics have come up recently.',
        priority: 'medium',
        suggestedQuestions: [
          'Are the current therapy goals still aligned with our priorities?',
          'How can we better reinforce therapy goals at home?',
          'Should we consider adding or changing therapy modalities?',
        ],
      },
      diagnosis: {
        topic: 'Diagnostic follow-up',
        context: 'Diagnosis-related concerns were recently discussed.',
        priority: 'medium',
        suggestedQuestions: [
          'Should we pursue additional evaluation or re-assessment?',
          'Are there co-occurring conditions we should screen for?',
          'What developmental benchmarks should we be tracking?',
        ],
      },
    };

    return topicDiscussions[topic] || null;
  }
}

// ============================================================================
// Utility
// ============================================================================

function calculateAge(dateOfBirth: string): number | undefined {
  try {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : undefined;
  } catch {
    return undefined;
  }
}

function formatDomain(domain: string): string {
  return domain
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================================================
// Singleton & Convenience
// ============================================================================

let _generator: AICareplanGenerator | null = null;

export function getCareplanGenerator(): AICareplanGenerator {
  if (!_generator) _generator = new AICareplanGenerator();
  return _generator;
}

/**
 * Quick helper: generate a full care plan for a child.
 */
export async function generateCarePlan(
  userId: string,
  childId: string
): Promise<GeneratedCarePlan> {
  return getCareplanGenerator().generateCarePlan(userId, childId);
}

export default AICareplanGenerator;
