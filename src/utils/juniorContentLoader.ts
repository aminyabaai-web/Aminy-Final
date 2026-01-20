// Junior Content Loader - Loads and manages activity content packs

import foundationData from '../content/foundation.json';
import levelUpData from '../content/level_up_10_12.json';
import bigFeelingsData from '../content/boosters/big_feelings.json';
import makingFriendsData from '../content/boosters/making_friends.json';
import transitionsData from '../content/boosters/transitions.json';
import publicSpeakingData from '../content/boosters/public_speaking.json';

export interface Activity {
  id: string;
  title: string;
  age_band: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  domain: string;
  target: string;
  outcome_tags: string[];
  prompting_hierarchy: string[];
  script_parent: string;
  script_child: string;
  visuals: string[];
  success_criteria: string;
  mastery_rule: string;
  generalization: string;
  variants: any[];
}

export interface ActivityPack {
  name: string;
  description: string;
  version: string;
  activities: Activity[];
  theme?: string;
  target_age?: string;
}

export interface SessionLog {
  activity_id: string;
  timestamp: Date;
  accuracy: number; // 0-100
  latency: number; // seconds to complete
  prompt_level: number; // 0-4 (hierarchy index)
  fatigue_flag: boolean;
  errors: string[];
  session_duration: number; // seconds
  tokens_earned?: number;
}

export class JuniorContentLoader {
  private foundation: ActivityPack;
  private levelUp: ActivityPack;
  private boosters: Map<string, ActivityPack>;
  private sessionHistory: SessionLog[] = [];
  private isLevelUpEnabled: boolean = false;

  constructor() {
    this.foundation = foundationData as ActivityPack;
    this.levelUp = levelUpData as ActivityPack;
    this.boosters = new Map([
      ['big_feelings', bigFeelingsData as ActivityPack],
      ['making_friends', makingFriendsData as ActivityPack],
      ['transitions', transitionsData as ActivityPack],
      ['public_speaking', publicSpeakingData as ActivityPack]
    ]);

    // Load session history from localStorage
    this.loadSessionHistory();
  }

  // Get all available activities based on settings
  getAllActivities(childAge?: number, enabledDomains?: string[]): Activity[] {
    let activities: Activity[] = [...this.foundation.activities];

    // Add Level Up if enabled or age appropriate
    if (this.isLevelUpEnabled || (childAge && childAge >= 10)) {
      activities = [...activities, ...this.levelUp.activities];
    }

    // Add all booster activities
    this.boosters.forEach(pack => {
      activities = [...activities, ...pack.activities];
    });

    // Filter by enabled domains if specified
    if (enabledDomains && enabledDomains.length > 0) {
      activities = activities.filter(a => enabledDomains.includes(a.domain));
    }

    return activities;
  }

  // Get activities filtered by age band
  getActivitiesByAge(childAge: number, enabledDomains?: string[]): Activity[] {
    const allActivities = this.getAllActivities(childAge, enabledDomains);
    
    return allActivities.filter(activity => {
      // Parse age band (e.g., "3–6", "10-12")
      const ageBand = activity.age_band.replace(/–/g, '-');
      const [minAge, maxAge] = ageBand.split('-').map(Number);
      return childAge >= minAge && childAge <= maxAge;
    });
  }

  // Get specific activity by ID
  getActivityById(activityId: string): Activity | undefined {
    const allActivities = this.getAllActivities();
    return allActivities.find(a => a.id === activityId);
  }

  // Get activities by domain
  getActivitiesByDomain(domain: string): Activity[] {
    const allActivities = this.getAllActivities();
    return allActivities.filter(a => a.domain === domain);
  }

  // Get booster pack
  getBoosterPack(theme: string): ActivityPack | undefined {
    return this.boosters.get(theme);
  }

  // Get all booster packs
  getAllBoosters(): Map<string, ActivityPack> {
    return this.boosters;
  }

  // Enable/disable Level Up content
  setLevelUpEnabled(enabled: boolean): void {
    this.isLevelUpEnabled = enabled;
  }

  // Log session data
  logSession(log: SessionLog): void {
    this.sessionHistory.push(log);
    this.saveSessionHistory();
  }

  // Get session history for an activity
  getActivityHistory(activityId: string): SessionLog[] {
    return this.sessionHistory.filter(log => log.activity_id === activityId);
  }

  // Get recent session history
  getRecentSessions(count: number = 10): SessionLog[] {
    return this.sessionHistory.slice(-count);
  }

  // Calculate success rate for an activity
  getSuccessRate(activityId: string): number {
    const history = this.getActivityHistory(activityId);
    if (history.length === 0) return 0;

    const totalAccuracy = history.reduce((sum, log) => sum + log.accuracy, 0);
    return totalAccuracy / history.length;
  }

  // Calculate average prompt level for an activity (lower is better)
  getAveragePromptLevel(activityId: string): number {
    const history = this.getActivityHistory(activityId);
    if (history.length === 0) return 0;

    const totalPromptLevel = history.reduce((sum, log) => sum + log.prompt_level, 0);
    return totalPromptLevel / history.length;
  }

  // Check if activity is mastered
  isActivityMastered(activityId: string): boolean {
    const activity = this.getActivityById(activityId);
    if (!activity) return false;

    const history = this.getActivityHistory(activityId);
    
    // Simple mastery check: 2+ consecutive sessions with 80%+ accuracy
    if (history.length < 2) return false;
    
    const lastTwo = history.slice(-2);
    return lastTwo.every(log => log.accuracy >= 80);
  }

  // Get total tokens earned
  getTotalTokens(): number {
    return this.sessionHistory.reduce((sum, log) => sum + (log.tokens_earned || 0), 0);
  }

  // Get weekly tokens (last 7 days)
  getWeeklyTokens(): number {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return this.sessionHistory
      .filter(log => new Date(log.timestamp) >= oneWeekAgo)
      .reduce((sum, log) => sum + (log.tokens_earned || 0), 0);
  }

  // Get Foundation 60 specific stats
  getFoundationProgress(): {
    total: number;
    completed: number;
    mastered: number;
    inProgress: number;
  } {
    const foundationActivities = this.foundation.activities;
    const attempted = new Set(this.sessionHistory.map(log => log.activity_id));
    const mastered = foundationActivities.filter(a => this.isActivityMastered(a.id));
    const inProgress = foundationActivities.filter(a => 
      attempted.has(a.id) && !this.isActivityMastered(a.id)
    );

    return {
      total: foundationActivities.length,
      completed: attempted.size,
      mastered: mastered.length,
      inProgress: inProgress.length
    };
  }

  // Save session history to localStorage
  private saveSessionHistory(): void {
    try {
      localStorage.setItem('aminy-jr-sessions', JSON.stringify(this.sessionHistory));
    } catch (error) {
      console.error('Failed to save session history:', error);
    }
  }

  // Load session history from localStorage
  private loadSessionHistory(): void {
    try {
      const saved = localStorage.getItem('aminy-jr-sessions');
      if (saved) {
        this.sessionHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load session history:', error);
      this.sessionHistory = [];
    }
  }

  // Clear all session data
  clearHistory(): void {
    this.sessionHistory = [];
    localStorage.removeItem('aminy-jr-sessions');
  }
}

// Singleton instance
export const contentLoader = new JuniorContentLoader();
