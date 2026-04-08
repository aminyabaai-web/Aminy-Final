// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Context Engine v1.0 - AI Context Awareness System
 * 
 * Provides intelligent context gathering and management for Ask Aminy,
 * enabling personalized, contextual responses based on user data and behavior.
 */

import { analytics } from './analytics-engine';
import { syncEncryptedStorage } from './security/encrypted-storage';

// Context Types
export interface ChildContext {
  name: string;
  age?: number;
  diagnoses: string[];
  communicationLevel: 'single words' | 'short phrases' | 'sentences' | 'fluent';
  currentChallenges: string[];
  recentProgress: string[];
  interests: string[];
  triggers: string[];
  strengths: string[];
  supportNeeds: string[];
}

export interface CaregiverContext {
  name: string;
  relationship: string;
  primaryConcerns: string[];
  goals: string[];
  preferredTone: 'supportive' | 'clinical' | 'practical';
  experienceLevel: 'new' | 'experienced' | 'expert';
  stressLevel: 'low' | 'medium' | 'high';
  availableTime: 'minimal' | 'moderate' | 'flexible';
}

export interface SessionContext {
  currentRoute: string;
  recentActions: string[];
  activeFeatures: string[];
  sessionDuration: number;
  previousConversations: ConversationSummary[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'crisis';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface ConversationSummary {
  timestamp: number;
  topic: string;
  sentiment: 'positive' | 'neutral' | 'concerned' | 'frustrated';
  resolved: boolean;
  followUpNeeded: boolean;
  keyInsights: string[];
}

export interface ContextualPrompt {
  prompt: string;
  priority: number;
  category: 'urgent' | 'routine' | 'development' | 'behavior' | 'support';
  personalization: {
    childName: string;
    specificContext: string;
    suggestedFollowUp?: string;
  };
}

export interface ContextualResponse {
  baseResponse: string;
  personalizedElements: {
    childSpecific: string[];
    situationalAwareness: string[];
    actionableSteps: string[];
    encouragement: string[];
  };
  followUpSuggestions: string[];
  resourceRecommendations: string[];
  urgencyAssessment: 'routine' | 'moderate' | 'urgent' | 'crisis';
}

class ContextEngine {
  private childContext: ChildContext | null = null;
  private caregiverContext: CaregiverContext | null = null;
  private sessionContext: SessionContext;
  private conversationHistory: ConversationSummary[] = [];
  private behaviorPatterns: Map<string, { count: number; lastSeen: string; data: unknown }> = new Map();

  constructor() {
    this.sessionContext = {
      currentRoute: window.location.pathname,
      recentActions: [],
      activeFeatures: [],
      sessionDuration: 0,
      previousConversations: [],
      urgencyLevel: 'low',
      deviceType: this.detectDeviceType(),
      timeOfDay: this.getTimeOfDay(),
    };

    this.initializeContext();
  }

  private initializeContext(): void {
    // Load existing context from storage
    this.loadStoredContext();
    
    // Set up context tracking
    this.trackUserBehavior();
    
    // Monitor route changes for context updates
    this.monitorRouteChanges();
    
  }

  private loadStoredContext(): void {
    try {
      // Load child context
      const childData = syncEncryptedStorage.getItem('child');
      if (childData) {
        const child = JSON.parse(childData);
        this.childContext = {
          name: child.name || 'your child',
          age: child.age,
          diagnoses: child.diagnoses || [],
          communicationLevel: child.communicationLevel || 'sentences',
          currentChallenges: child.challenges || [],
          recentProgress: child.progress || [],
          interests: child.interests || [],
          triggers: child.triggers || [],
          strengths: child.strengths || [],
          supportNeeds: child.supportNeeds || [],
        };
      }

      // Load caregiver context
      const caregiverData = syncEncryptedStorage.getItem('caregiver');
      if (caregiverData) {
        const caregiver = JSON.parse(caregiverData);
        this.caregiverContext = {
          name: caregiver.name || 'Parent',
          relationship: caregiver.relationship || 'parent',
          primaryConcerns: caregiver.concerns || [],
          goals: caregiver.goals || [],
          preferredTone: caregiver.tone || 'supportive',
          experienceLevel: caregiver.experience || 'new',
          stressLevel: this.assessStressLevel(),
          availableTime: caregiver.timeAvailable || 'moderate',
        };
      }

      // Load conversation history
      const historyData = syncEncryptedStorage.getItem('conversationHistory');
      if (historyData) {
        this.conversationHistory = JSON.parse(historyData);
      }

    } catch (error) {
    }
  }

  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  private assessStressLevel(): 'low' | 'medium' | 'high' {
    // Analyze user behavior patterns to assess stress level
    const recentErrors = analytics.exportData().events.filter(
      e => e.event === 'error_occurred' && 
      e.timestamp > Date.now() - 3600000 // Last hour
    ).length;

    const rapidClicks = this.sessionContext.recentActions.filter(
      action => action.includes('rapid_click')
    ).length;

    if (recentErrors > 2 || rapidClicks > 5) return 'high';
    if (recentErrors > 0 || rapidClicks > 2) return 'medium';
    return 'low';
  }

  private trackUserBehavior(): void {
    // Track user actions for context building
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const action = `clicked_${target.tagName.toLowerCase()}`;
      this.addRecentAction(action);
    });

    // Track time spent on different features
    let featureStartTime = Date.now();
    const observer = new MutationObserver(() => {
      const currentFeature = this.detectCurrentFeature();
      if (currentFeature && !this.sessionContext.activeFeatures.includes(currentFeature)) {
        this.sessionContext.activeFeatures.push(currentFeature);
        
        analytics.track('feature_engaged', {
          feature: currentFeature,
          context: this.getSessionContext(),
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  private detectCurrentFeature(): string | null {
    const url = window.location.pathname;
    const title = document.title;
    
    if (url.includes('/care') || title.includes('Care')) return 'care_planning';
    if (url.includes('/junior') || title.includes('Junior') || title.includes('Ease')) return 'junior_mode';
    if (url.includes('/reports') || title.includes('Reports')) return 'reports';
    if (url.includes('/vault') || title.includes('Vault')) return 'document_vault';
    if (document.querySelector('[data-feature="ask-aminy"]')) return 'ask_aminy';
    
    return null;
  }

  private monitorRouteChanges(): void {
    let lastRoute = window.location.pathname;
    
    const checkRoute = () => {
      const currentRoute = window.location.pathname;
      if (currentRoute !== lastRoute) {
        this.sessionContext.currentRoute = currentRoute;
        this.addRecentAction(`navigated_to_${currentRoute.replace('/', '')}`);
        lastRoute = currentRoute;
        
        analytics.track('route_context_change', {
          from: lastRoute,
          to: currentRoute,
          context: this.getSessionContext(),
        });
      }
    };

    // Check for route changes every 500ms
    setInterval(checkRoute, 500);
  }

  private addRecentAction(action: string): void {
    this.sessionContext.recentActions.unshift(action);
    
    // Keep only last 20 actions
    if (this.sessionContext.recentActions.length > 20) {
      this.sessionContext.recentActions = this.sessionContext.recentActions.slice(0, 20);
    }
  }

  // Public API Methods
  public getChildContext(): ChildContext | null {
    return this.childContext;
  }

  public getCaregiverContext(): CaregiverContext | null {
    return this.caregiverContext;
  }

  public getSessionContext(): SessionContext {
    return {
      ...this.sessionContext,
      sessionDuration: Date.now() - (analytics.exportData()?.session?.startTime ?? Date.now()),
      previousConversations: this.conversationHistory.slice(-5), // Last 5 conversations
    };
  }

  public updateChildContext(updates: Partial<ChildContext>): void {
    if (this.childContext) {
      this.childContext = { ...this.childContext, ...updates };
    } else {
      this.childContext = updates as ChildContext;
    }
    
    // Store updated context
    syncEncryptedStorage.setItem('child', JSON.stringify(this.childContext));
    
    analytics.track('child_context_updated', {
      updatedFields: Object.keys(updates),
      contextRichness: this.calculateContextRichness(),
    });
  }

  public updateCaregiverContext(updates: Partial<CaregiverContext>): void {
    if (this.caregiverContext) {
      this.caregiverContext = { ...this.caregiverContext, ...updates };
    } else {
      this.caregiverContext = updates as CaregiverContext;
    }
    
    // Store updated context
    syncEncryptedStorage.setItem('caregiver', JSON.stringify(this.caregiverContext));
    
    analytics.track('caregiver_context_updated', {
      updatedFields: Object.keys(updates),
    });
  }

  public addConversationSummary(summary: ConversationSummary): void {
    this.conversationHistory.unshift(summary);
    
    // Keep only last 10 conversations
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(0, 10);
    }
    
    // Store updated history
    syncEncryptedStorage.setItem('conversationHistory', JSON.stringify(this.conversationHistory));
    
    // Update session context based on conversation
    this.updateSessionUrgency(summary);
  }

  private updateSessionUrgency(summary: ConversationSummary): void {
    const urgentTopics = ['crisis', 'emergency', 'urgent', 'help', 'scared', 'dangerous'];
    const concernedTopics = ['worried', 'concerned', 'struggling', 'difficult', 'frustrated'];
    
    const isUrgent = urgentTopics.some(topic => 
      summary.topic.toLowerCase().includes(topic)
    );
    
    const isConcerned = concernedTopics.some(topic => 
      summary.topic.toLowerCase().includes(topic)
    );
    
    if (isUrgent) {
      this.sessionContext.urgencyLevel = 'crisis';
    } else if (isConcerned && summary.sentiment === 'frustrated') {
      this.sessionContext.urgencyLevel = 'high';
    } else if (isConcerned) {
      this.sessionContext.urgencyLevel = 'medium';
    }
  }

  public generateContextualPrompts(): ContextualPrompt[] {
    const prompts: ContextualPrompt[] = [];
    const childName = this.childContext?.name || 'your child';
    
    // Time-based prompts
    if (this.sessionContext.timeOfDay === 'morning') {
      prompts.push({
        prompt: `Help with ${childName}'s morning routine`,
        priority: 8,
        category: 'routine',
        personalization: {
          childName,
          specificContext: 'morning routine strategies',
          suggestedFollowUp: 'Would you like tips for smoother transitions?',
        },
      });
    }
    
    if (this.sessionContext.timeOfDay === 'evening') {
      prompts.push({
        prompt: `Bedtime strategies for ${childName}`,
        priority: 9,
        category: 'routine',
        personalization: {
          childName,
          specificContext: 'bedtime and sleep support',
          suggestedFollowUp: 'Should we create a bedtime visual schedule?',
        },
      });
    }

    // Context-based prompts from recent activity
    if (this.sessionContext.activeFeatures.includes('care_planning')) {
      prompts.push({
        prompt: `Implementing ${childName}'s care plan activities`,
        priority: 7,
        category: 'development',
        personalization: {
          childName,
          specificContext: 'care plan implementation',
        },
      });
    }

    // Diagnosis-specific prompts
    if (this.childContext?.diagnoses.includes('autism')) {
      prompts.push({
        prompt: `Supporting ${childName} with sensory regulation`,
        priority: 6,
        category: 'behavior',
        personalization: {
          childName,
          specificContext: 'autism-specific sensory support',
        },
      });
    }

    // Communication level prompts
    if (this.childContext?.communicationLevel === 'single words') {
      prompts.push({
        prompt: `Expanding ${childName}'s communication skills`,
        priority: 8,
        category: 'development',
        personalization: {
          childName,
          specificContext: 'early communication development',
        },
      });
    }

    // Stress level prompts
    if (this.caregiverContext?.stressLevel === 'high') {
      prompts.push({
        prompt: 'Self-care strategies for parents',
        priority: 9,
        category: 'support',
        personalization: {
          childName,
          specificContext: 'caregiver support and wellbeing',
        },
      });
    }

    // Sort by priority and return top 6
    return prompts
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6);
  }

  public enhancePromptWithContext(userPrompt: string): {
    enhancedPrompt: string;
    context: Record<string, unknown>;
    personalizationLevel: 'basic' | 'moderate' | 'high';
  } {
    const contextRichness = this.calculateContextRichness();
    let enhancedPrompt = userPrompt;
    let personalizationLevel: 'basic' | 'moderate' | 'high' = 'basic';

    // Add child context
    if (this.childContext) {
      const childInfo = [];
      if (this.childContext.age) childInfo.push(`${this.childContext.age} years old`);
      if (this.childContext.diagnoses.length > 0) childInfo.push(`diagnosed with ${this.childContext.diagnoses.join(', ')}`);
      if (this.childContext.communicationLevel) childInfo.push(`communication level: ${this.childContext.communicationLevel}`);
      
      if (childInfo.length > 0) {
        enhancedPrompt += `\n\nChild context: ${this.childContext.name} is ${childInfo.join(', ')}.`;
        personalizationLevel = 'moderate';
      }
    }

    // Add recent challenges and progress
    if (this.childContext?.currentChallenges.length || this.childContext?.recentProgress.length) {
      if (this.childContext.currentChallenges.length > 0) {
        enhancedPrompt += `\nCurrent challenges: ${this.childContext.currentChallenges.join(', ')}.`;
      }
      if (this.childContext.recentProgress.length > 0) {
        enhancedPrompt += `\nRecent progress: ${this.childContext.recentProgress.join(', ')}.`;
      }
      personalizationLevel = 'high';
    }

    // Add caregiver preferences
    if (this.caregiverContext) {
      enhancedPrompt += `\nPreferred communication style: ${this.caregiverContext.preferredTone}.`;
      enhancedPrompt += `\nCaregiver experience level: ${this.caregiverContext.experienceLevel}.`;
      
      if (this.caregiverContext.availableTime === 'minimal') {
        enhancedPrompt += '\nPlease provide concise, actionable advice.';
      }
    }

    // Add urgency context
    if (this.sessionContext.urgencyLevel !== 'low') {
      enhancedPrompt += `\nUrgency level: ${this.sessionContext.urgencyLevel}. Please prioritize immediate, practical support.`;
    }

    return {
      enhancedPrompt,
      context: {
        child: this.childContext,
        caregiver: this.caregiverContext,
        session: this.getSessionContext(),
        contextRichness,
      },
      personalizationLevel,
    };
  }

  private calculateContextRichness(): number {
    let score = 0;
    
    // Child context scoring
    if (this.childContext) {
      if (this.childContext.name && this.childContext.name !== 'your child') score += 10;
      if (this.childContext.age) score += 10;
      if (this.childContext.diagnoses.length > 0) score += 15;
      if (this.childContext.communicationLevel) score += 10;
      if (this.childContext.currentChallenges.length > 0) score += 15;
      if (this.childContext.interests.length > 0) score += 10;
      if (this.childContext.strengths.length > 0) score += 10;
    }
    
    // Caregiver context scoring
    if (this.caregiverContext) {
      if (this.caregiverContext.primaryConcerns.length > 0) score += 10;
      if (this.caregiverContext.goals.length > 0) score += 10;
      if (this.caregiverContext.preferredTone !== 'supportive') score += 5;
    }
    
    // Session context scoring
    if (this.conversationHistory.length > 0) score += 10;
    if (this.sessionContext.activeFeatures.length > 2) score += 5;
    
    return Math.min(100, score);
  }

  public getContextInsights(): {
    contextRichness: number;
    missingContext: string[];
    recommendations: string[];
    personalizationOpportunities: string[];
  } {
    const contextRichness = this.calculateContextRichness();
    const missingContext: string[] = [];
    const recommendations: string[] = [];
    const personalizationOpportunities: string[] = [];

    // Identify missing context
    if (!this.childContext?.age) missingContext.push('Child age');
    if (!this.childContext?.diagnoses.length) missingContext.push('Diagnoses/concerns');
    if (!this.childContext?.interests.length) missingContext.push('Child interests');
    if (!this.caregiverContext?.goals.length) missingContext.push('Parent goals');

    // Generate recommendations
    if (contextRichness < 30) {
      recommendations.push('Complete child profile for better personalization');
    }
    if (this.conversationHistory.length === 0) {
      recommendations.push('Start conversations to build context');
    }
    if (!this.childContext?.strengths.length) {
      recommendations.push('Document child strengths for balanced support');
    }

    // Identify personalization opportunities
    if (this.childContext?.interests.length) {
      personalizationOpportunities.push('Incorporate child interests into activities');
    }
    if (this.childContext?.currentChallenges.length) {
      personalizationOpportunities.push('Provide targeted support for current challenges');
    }

    return {
      contextRichness,
      missingContext,
      recommendations,
      personalizationOpportunities,
    };
  }

  public exportContextData(): {
    child: ChildContext | null;
    caregiver: CaregiverContext | null;
    session: SessionContext;
    conversations: ConversationSummary[];
    insights: ReturnType<ContextEngine['getContextInsights']>;
  } {
    return {
      child: this.childContext,
      caregiver: this.caregiverContext,
      session: this.getSessionContext(),
      conversations: this.conversationHistory,
      insights: this.getContextInsights(),
    };
  }
}

// Global Context Engine Instance
export const contextEngine = new ContextEngine();

// React Hook for Context Engine
export function useContextEngine() {
  return {
    getChildContext: contextEngine.getChildContext.bind(contextEngine),
    getCaregiverContext: contextEngine.getCaregiverContext.bind(contextEngine),
    getSessionContext: contextEngine.getSessionContext.bind(contextEngine),
    updateChildContext: contextEngine.updateChildContext.bind(contextEngine),
    updateCaregiverContext: contextEngine.updateCaregiverContext.bind(contextEngine),
    addConversation: contextEngine.addConversationSummary.bind(contextEngine),
    generatePrompts: contextEngine.generateContextualPrompts.bind(contextEngine),
    enhancePrompt: contextEngine.enhancePromptWithContext.bind(contextEngine),
    getInsights: contextEngine.getContextInsights.bind(contextEngine),
    exportData: contextEngine.exportContextData.bind(contextEngine),
  };
}

// Utility functions
export function createConversationSummary(
  topic: string,
  sentiment: 'positive' | 'neutral' | 'concerned' | 'frustrated',
  resolved: boolean = false,
  keyInsights: string[] = []
): ConversationSummary {
  return {
    timestamp: Date.now(),
    topic,
    sentiment,
    resolved,
    followUpNeeded: !resolved && sentiment !== 'positive',
    keyInsights,
  };
}

export function detectUrgencyFromText(text: string): 'low' | 'medium' | 'high' | 'crisis' {
  const urgentKeywords = ['emergency', 'crisis', 'urgent', 'help', 'scared', 'dangerous', 'emergency room', 'call 911'];
  const highKeywords = ['struggling', 'worried', 'frustrated', 'difficult', 'breaking down', 'overwhelmed'];
  const mediumKeywords = ['concerned', 'challenging', 'unsure', 'confused', 'tired'];

  const lowerText = text.toLowerCase();
  
  if (urgentKeywords.some(keyword => lowerText.includes(keyword))) return 'crisis';
  if (highKeywords.some(keyword => lowerText.includes(keyword))) return 'high';
  if (mediumKeywords.some(keyword => lowerText.includes(keyword))) return 'medium';
  
  return 'low';
}

export { ContextEngine };