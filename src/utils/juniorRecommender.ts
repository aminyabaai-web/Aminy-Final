// Junior Recommender - AI-powered activity recommendation engine

import { Activity, ActivityVariant, SessionLog, contentLoader } from './juniorContentLoader';

export interface RecommendationContext {
  childAge: number;
  recentGoals?: string[];
  enabledDomains?: string[];
  sessionCount?: number;
  fatigueDetected?: boolean;
  preferredDifficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface RecommendationResult {
  activity: Activity;
  score: number;
  reason: string;
  alternates?: Activity[];
}

export class JuniorRecommender {
  private loader = contentLoader;

  // Main recommendation function
  recommend(context: RecommendationContext): RecommendationResult | null {
    const candidates = this.getCandidateActivities(context);
    const scored = this.scoreActivities(candidates, context);

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    // Handle empty results
    if (scored.length === 0) {
      return null;
    }

    const top = scored[0];
    const alternates = scored.slice(1, 4).map(s => s.activity);

    return {
      activity: top.activity,
      score: top.score,
      reason: this.generateReason(top, context),
      alternates
    };
  }

  // Get multiple recommendations
  getRecommendations(context: RecommendationContext, count: number = 3): RecommendationResult[] {
    const candidates = this.getCandidateActivities(context);
    const scored = this.scoreActivities(candidates, context);
    
    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, count).map(s => ({
      activity: s.activity,
      score: s.score,
      reason: this.generateReason(s, context),
      alternates: []
    }));
  }

  // Get candidate activities based on context
  private getCandidateActivities(context: RecommendationContext): Activity[] {
    let activities = this.loader.getActivitiesByAge(context.childAge, context.enabledDomains);

    // Filter out mastered activities (keep some for generalization)
    activities = activities.filter(activity => {
      const mastered = this.loader.isActivityMastered(activity.id);
      // Keep 20% of mastered activities for practice
      return !mastered || Math.random() < 0.2;
    });

    // If fatigue detected, filter to easier activities or regulation domain
    if (context.fatigueDetected) {
      activities = activities.filter(a => 
        a.domain === 'regulation' || 
        a.level === 'beginner'
      );
    }

    return activities;
  }

  // Score activities based on multiple factors
  private scoreActivities(activities: Activity[], context: RecommendationContext): Array<{activity: Activity, score: number}> {
    return activities.map(activity => {
      let score = 0;

      // 1. Age appropriateness (base score: 10 points)
      score += 10;

      // 2. Match with recent goals (15 points max)
      if (context.recentGoals) {
        const goalMatch = context.recentGoals.some(goal => 
          activity.outcome_tags.some(tag => 
            goal.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (goalMatch) score += 15;
      }

      // 3. Domain variety (10 points)
      const recentSessions = this.loader.getRecentSessions(5);
      const recentDomains = recentSessions.map(s => {
        const act = this.loader.getActivityById(s.activity_id);
        return act?.domain;
      });
      if (!recentDomains.includes(activity.domain)) {
        score += 10; // Reward domain variety
      }

      // 4. Success rate on similar activities (20 points max)
      const domainActivities = this.loader.getActivitiesByDomain(activity.domain);
      const domainSuccessRates = domainActivities.map(a => 
        this.loader.getSuccessRate(a.id)
      );
      const avgDomainSuccess = domainSuccessRates.length > 0
        ? domainSuccessRates.reduce((a, b) => a + b, 0) / domainSuccessRates.length
        : 50;
      
      // If high success in domain, suggest intermediate/advanced
      if (avgDomainSuccess >= 80 && activity.level !== 'beginner') {
        score += 20;
      } else if (avgDomainSuccess < 60 && activity.level === 'beginner') {
        score += 15;
      }

      // 5. Prompt independence (15 points)
      const avgPromptLevel = this.loader.getAveragePromptLevel(activity.id);
      if (avgPromptLevel < 2) { // Low prompt = more independent
        score += 15;
      }

      // 6. Novelty bonus (10 points)
      const history = this.loader.getActivityHistory(activity.id);
      if (history.length === 0) {
        score += 10; // Never tried before
      } else if (history.length < 3) {
        score += 5; // Still relatively new
      }

      // 7. Level Up bonus (special weight for 10-12 age)
      if (context.childAge >= 10 && activity.age_band.includes('10-12')) {
        score += 15;
      }

      // 8. Generalization check
      const mastered = this.loader.isActivityMastered(activity.id);
      if (mastered && activity.variants && activity.variants.length > 0) {
        score += 8; // Suggest variants for generalization
      }

      // 9. Fatigue adjustment
      if (context.fatigueDetected) {
        if (activity.domain === 'regulation') {
          score += 25; // Strongly prefer regulation when fatigued
        }
        if (activity.level === 'beginner') {
          score += 10; // Prefer easier when fatigued
        }
      }

      // 10. Session count adjustment (easier early on)
      if ((context.sessionCount || 0) < 5 && activity.level === 'beginner') {
        score += 10;
      }

      return { activity, score };
    });
  }

  // Generate human-readable reason for recommendation
  private generateReason(scored: {activity: Activity, score: number}, context: RecommendationContext): string {
    const { activity } = scored;
    const history = this.loader.getActivityHistory(activity.id);
    const successRate = this.loader.getSuccessRate(activity.id);
    const mastered = this.loader.isActivityMastered(activity.id);

    if (context.fatigueDetected && activity.domain === 'regulation') {
      return "Let's take a calming break together";
    }

    if (history.length === 0) {
      return "Time to try something new!";
    }

    if (mastered) {
      return "You're so good at this! Let's practice in a new way";
    }

    if (successRate >= 70) {
      return "You're doing great at this—keep it up!";
    }

    if (successRate < 60) {
      return "Let's practice this one more—you're almost there!";
    }

    if (context.recentGoals && context.recentGoals.length > 0) {
      const matchedGoal = context.recentGoals.find(goal => 
        activity.outcome_tags.some(tag => goal.toLowerCase().includes(tag.toLowerCase()))
      );
      if (matchedGoal) {
        return `This helps with ${matchedGoal}`;
      }
    }

    // Default reason
    return "Perfect for your age and skills!";
  }

  // Suggest Calm Corner if fatigue/difficulty detected
  shouldSuggestCalmCorner(recentSessions: SessionLog[]): boolean {
    if (recentSessions.length < 2) return false;

    const lastTwo = recentSessions.slice(-2);

    // Suggest if both recent sessions had low success
    if (lastTwo.every(s => s.accuracy < 60)) {
      return true;
    }

    // Suggest if fatigue flagged
    if (lastTwo.some(s => s.fatigue_flag)) {
      return true;
    }

    // Suggest if error rate is high
    const avgErrors = lastTwo.reduce((sum, s) => sum + s.errors.length, 0) / lastTwo.length;
    if (avgErrors > 3) {
      return true;
    }

    return false;
  }

  // Determine if difficulty should increase
  shouldAdvanceDifficulty(activityId: string): boolean {
    const history = this.loader.getActivityHistory(activityId);
    if (history.length < 2) return false;

    const lastTwo = history.slice(-2);

    // Check: 80%+ accuracy and low prompts for 2 sessions
    return lastTwo.every(s => s.accuracy >= 80 && s.prompt_level <= 1);
  }

  // Determine if should simplify or switch modality
  shouldSimplify(activityId: string): boolean {
    const history = this.loader.getActivityHistory(activityId);
    if (history.length < 2) return false;

    const recent = history.slice(-2);

    // If success < 60% or fatigue for 2 sessions
    return recent.every(s => s.accuracy < 60 || s.fatigue_flag);
  }

  // Get next generalization variant
  getGeneralizationVariant(activity: Activity): ActivityVariant | null {
    if (!activity.variants || activity.variants.length === 0) {
      return null;
    }

    // Randomly select a variant for now
    // In production, you'd track which variants have been used
    const randomIndex = Math.floor(Math.random() * activity.variants.length);
    return activity.variants[randomIndex];
  }

  // Calculate weekly badge progress
  getWeeklyBadgeProgress(): { current: number; target: number; earned: boolean } {
    const weeklyTokens = this.loader.getWeeklyTokens();
    const target = 5;

    return {
      current: weeklyTokens,
      target: target,
      earned: weeklyTokens >= target
    };
  }

  // Get achievement summary
  getAchievements(): {
    totalActivities: number;
    mastered: number;
    weeklyTokens: number;
    totalTokens: number;
    foundationProgress: number;
  } {
    const foundationStats = this.loader.getFoundationProgress();
    
    return {
      totalActivities: foundationStats.completed,
      mastered: foundationStats.mastered,
      weeklyTokens: this.loader.getWeeklyTokens(),
      totalTokens: this.loader.getTotalTokens(),
      foundationProgress: Math.round((foundationStats.mastered / foundationStats.total) * 100)
    };
  }
}

// Singleton instance
export const recommender = new JuniorRecommender();
