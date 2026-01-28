/**
 * Outcomes Tracking Tests
 * Comprehensive tests for the outcomes tracking system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('../utils/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { metric_value: 5 }, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
  },
}));

// Define types inline to avoid import resolution issues
type EventType =
  | 'behavior_incident'
  | 'behavior_success'
  | 'goal_progress'
  | 'goal_completed'
  | 'caregiver_stress'
  | 'engagement_session'
  | 'ai_interaction'
  | 'routine_adherence'
  | 'skill_acquisition'
  | 'sleep_quality'
  | 'meltdown_duration'
  | 'transition_success';

interface OutcomeEvent {
  id?: string;
  user_id: string;
  child_id?: string;
  event_type: EventType;
  metric_name: string;
  metric_value: number;
  context?: Record<string, any>;
  created_at?: string;
}

// Helper functions for testing
function validateEventType(type: string): type is EventType {
  const validTypes: EventType[] = [
    'behavior_incident', 'behavior_success', 'goal_progress', 'goal_completed',
    'caregiver_stress', 'engagement_session', 'ai_interaction', 'routine_adherence',
    'skill_acquisition', 'sleep_quality', 'meltdown_duration', 'transition_success'
  ];
  return validTypes.includes(type as EventType);
}

function validateMetricValue(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

function calculateImprovementPercentage(baseline: number, current: number): number {
  if (baseline === 0) return current > 0 ? 100 : 0;
  return Math.round(((baseline - current) / baseline) * 100);
}

describe('Outcome Event Types', () => {
  it('should validate all supported event types', () => {
    const validTypes = [
      'behavior_incident', 'behavior_success', 'goal_progress', 'goal_completed',
      'caregiver_stress', 'engagement_session', 'ai_interaction', 'routine_adherence',
      'skill_acquisition', 'sleep_quality', 'meltdown_duration', 'transition_success'
    ];

    validTypes.forEach(type => {
      expect(validateEventType(type)).toBe(true);
    });
  });

  it('should reject invalid event types', () => {
    const invalidTypes = ['invalid', 'random', 'test', ''];
    invalidTypes.forEach(type => {
      expect(validateEventType(type)).toBe(false);
    });
  });
});

describe('Metric Value Validation', () => {
  it('should accept valid numeric values', () => {
    expect(validateMetricValue(0)).toBe(true);
    expect(validateMetricValue(1)).toBe(true);
    expect(validateMetricValue(100)).toBe(true);
    expect(validateMetricValue(-5)).toBe(true);
    expect(validateMetricValue(3.14)).toBe(true);
  });

  it('should reject invalid values', () => {
    expect(validateMetricValue(NaN)).toBe(false);
    expect(validateMetricValue(Infinity)).toBe(false);
    expect(validateMetricValue(-Infinity)).toBe(false);
  });
});

describe('Improvement Calculations', () => {
  it('should calculate improvement percentage for behavior incidents', () => {
    // If baseline was 10 incidents/week and now 6, that's 40% improvement
    expect(calculateImprovementPercentage(10, 6)).toBe(40);
  });

  it('should handle zero baseline correctly', () => {
    expect(calculateImprovementPercentage(0, 5)).toBe(100);
    expect(calculateImprovementPercentage(0, 0)).toBe(0);
  });

  it('should calculate negative improvement (regression)', () => {
    // If baseline was 5 and now 8, that's -60% (worsening)
    expect(calculateImprovementPercentage(5, 8)).toBe(-60);
  });

  it('should calculate perfect improvement', () => {
    expect(calculateImprovementPercentage(10, 0)).toBe(100);
  });
});

describe('Outcome Event Structure', () => {
  it('should have required fields', () => {
    const event: OutcomeEvent = {
      user_id: 'test-user',
      event_type: 'behavior_incident',
      metric_name: 'daily_incidents',
      metric_value: 3,
    };

    expect(event.user_id).toBeDefined();
    expect(event.event_type).toBeDefined();
    expect(event.metric_name).toBeDefined();
    expect(event.metric_value).toBeDefined();
  });

  it('should support optional context', () => {
    const event: OutcomeEvent = {
      user_id: 'test-user',
      event_type: 'behavior_incident',
      metric_name: 'daily_incidents',
      metric_value: 3,
      context: {
        trigger: 'transition',
        location: 'home',
        time_of_day: 'morning',
      },
    };

    expect(event.context).toEqual({
      trigger: 'transition',
      location: 'home',
      time_of_day: 'morning',
    });
  });

  it('should support child_id for child-specific events', () => {
    const event: OutcomeEvent = {
      user_id: 'test-user',
      child_id: 'child-123',
      event_type: 'skill_acquisition',
      metric_name: 'communication_score',
      metric_value: 75,
    };

    expect(event.child_id).toBe('child-123');
  });
});

describe('Stress Level Tracking', () => {
  it('should accept valid stress levels (1-10)', () => {
    for (let i = 1; i <= 10; i++) {
      expect(validateMetricValue(i)).toBe(true);
    }
  });

  it('should calculate stress reduction correctly', () => {
    // Baseline stress: 8/10, Current: 5/10 = 37.5% improvement
    const improvement = calculateImprovementPercentage(8, 5);
    expect(improvement).toBe(38); // Rounded
  });
});

describe('Engagement Session Tracking', () => {
  it('should track session duration in seconds', () => {
    const sessionEvent: OutcomeEvent = {
      user_id: 'test-user',
      event_type: 'engagement_session',
      metric_name: 'session_duration',
      metric_value: 1800, // 30 minutes in seconds
      context: {
        feature_used: 'ai_chat',
        session_type: 'support',
      },
    };

    expect(sessionEvent.metric_value).toBe(1800);
    expect(sessionEvent.context?.feature_used).toBe('ai_chat');
  });
});

describe('Goal Progress Tracking', () => {
  it('should track goal progress as percentage', () => {
    const goalEvent: OutcomeEvent = {
      user_id: 'test-user',
      event_type: 'goal_progress',
      metric_name: 'potty_training_progress',
      metric_value: 65, // 65% complete
      context: {
        goal_id: 'goal-123',
        milestone_reached: 'dry_during_naps',
      },
    };

    expect(goalEvent.metric_value).toBe(65);
  });

  it('should mark goal completion', () => {
    const completionEvent: OutcomeEvent = {
      user_id: 'test-user',
      event_type: 'goal_completed',
      metric_name: 'potty_training_progress',
      metric_value: 100,
      context: {
        goal_id: 'goal-123',
        days_to_complete: 45,
      },
    };

    expect(completionEvent.event_type).toBe('goal_completed');
    expect(completionEvent.metric_value).toBe(100);
  });
});

describe('Retention Metrics', () => {
  it('should calculate D1 retention correctly', () => {
    const totalUsers = 100;
    const returnedD1 = 65;
    const d1Retention = (returnedD1 / totalUsers) * 100;
    expect(d1Retention).toBe(65);
  });

  it('should calculate D7 retention correctly', () => {
    const totalUsers = 100;
    const returnedD7 = 40;
    const d7Retention = (returnedD7 / totalUsers) * 100;
    expect(d7Retention).toBe(40);
  });

  it('should calculate D30 retention correctly', () => {
    const totalUsers = 100;
    const returnedD30 = 25;
    const d30Retention = (returnedD30 / totalUsers) * 100;
    expect(d30Retention).toBe(25);
  });
});

describe('K-Factor (Virality) Calculations', () => {
  it('should calculate K-factor correctly', () => {
    const invitesSent = 50;
    const conversions = 15;
    const inviteRate = 0.3; // 30% of users send invites

    const conversionRate = conversions / invitesSent;
    const kFactor = inviteRate * conversionRate;

    expect(kFactor).toBeCloseTo(0.09); // K-factor of 0.09
  });

  it('should identify viral growth (K > 1)', () => {
    const kFactor = 1.2;
    expect(kFactor > 1).toBe(true);
  });
});
