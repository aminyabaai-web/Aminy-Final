import { describe, expect, it } from 'vitest';

import {
  buildCaregiverWeeklySummary,
  buildDailyPlanItems,
  buildLegacyConversationState,
  mapCaregiverSummaryToClinicalReportData,
  mapSnapshotToRoutineGroups,
  type CaregiverSummary,
  type DailyPlanSnapshot,
} from '../lib/caregiver-workflow';
import type { MessageRecord } from '../lib/conversation-store';
import type { ConversationSummary } from '../lib/multi-turn-memory';

describe('buildLegacyConversationState', () => {
  it('appends the new message and refreshes derived metadata', () => {
    const existingMessages = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Bedtime is hard and transitions trigger meltdowns.',
        metadata: {},
        created_at: '2026-03-09T08:00:00.000Z',
      },
    ];

    const nextMessage: MessageRecord = {
      id: 'msg-2',
      conversationId: 'conv-1',
      role: 'assistant',
      content: 'Try a visual schedule and a calmer bedtime transition.',
      createdAt: '2026-03-09T08:01:00.000Z',
      metadata: { topic: 'routines' },
    };

    const mirror = buildLegacyConversationState(existingMessages, nextMessage, [
      { category: 'strategy', content: 'visual schedule before bedtime', confidence: 0.9, source: 'conversation' },
    ]);

    expect(mirror.messageCount).toBe(2);
    expect(mirror.messages).toHaveLength(2);
    expect(mirror.topics).toContain('routines');
    expect(mirror.factsExtracted).toContain('strategy: visual schedule before bedtime');
    expect(mirror.lastMessageAt).toBe('2026-03-09T08:01:00.000Z');
  });
});

describe('buildDailyPlanItems', () => {
  it('builds a plan from goals, memory facts, and conversation summaries', () => {
    const summary: ConversationSummary = {
      id: 'summary-1',
      conversationId: 'conv-1',
      userId: 'user-1',
      childId: 'child-1',
      summary: 'Recent coaching focused on calmer bedtime transitions and peer play.',
      keyTopics: ['routines', 'social'],
      emotionalTone: 'neutral',
      actionItems: [],
      strategiesMentioned: [],
      createdAt: '2026-03-10T08:00:00.000Z',
    };

    const result = buildDailyPlanItems({
      childName: 'Maya',
      goals: [
        {
          id: 'goal-1',
          title: 'Morning communication practice',
          description: 'Use a short visual prompt before breakfast.',
          category: 'communication',
          progress: 0,
        },
      ],
      memoryFacts: [
        {
          id: 'fact-1',
          category: 'strategy',
          key: 'strategy_visual_schedule',
          value: 'A visual schedule lowers stress before bed.',
          extracted_at: '2026-03-09T19:00:00.000Z',
        },
      ],
      conversationSummaries: [summary],
    });

    expect(result.items).toHaveLength(3);
    expect(result.goalIds).toEqual(['goal-1']);
    expect(result.memoryFactIds).toEqual(['fact-1']);
    expect(result.conversationSummaryIds).toEqual(['summary-1']);
    expect(result.items[0].launchJuniorDomain).toBe('speech');
  });
});

describe('mapSnapshotToRoutineGroups', () => {
  it('groups stored plan items by time of day for the dashboard', () => {
    const snapshot: DailyPlanSnapshot = {
      id: 'plan-1',
      userId: 'user-1',
      childId: 'child-1',
      planDate: '2026-03-10',
      version: 1,
      status: 'active',
      source: 'generated',
      generatedFromGoalIds: ['goal-1'],
      generatedFromMemoryFactIds: [],
      generatedFromConversationSummaryIds: [],
      createdAt: '2026-03-10T07:00:00.000Z',
      updatedAt: '2026-03-10T07:00:00.000Z',
      items: [
        {
          id: 'item-1',
          title: 'Breakfast prompt',
          description: 'Practice a two-word request at breakfast.',
          source: 'goal',
          timeOfDay: 'morning',
          recommendedDurationMinutes: 10,
          completed: false,
          linkedGoalIds: ['goal-1'],
          launchJuniorDomain: 'speech',
        },
        {
          id: 'item-2',
          title: 'Bedtime wind-down',
          description: 'Use the visual schedule before pajamas.',
          source: 'memory',
          timeOfDay: 'bedtime',
          recommendedDurationMinutes: 12,
          completed: true,
          completedAt: '2026-03-10T20:00:00.000Z',
          linkedMemoryFactIds: ['fact-1'],
          launchJuniorDomain: 'routines',
        },
      ],
    };

    const groups = mapSnapshotToRoutineGroups(snapshot);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe('Morning Routine');
    expect(groups[1].completedCount).toBe(1);
  });
});

describe('buildCaregiverWeeklySummary', () => {
  it('computes the weekly summary from stored workflow records', () => {
    const planSnapshots: DailyPlanSnapshot[] = [
      {
        id: 'plan-1',
        userId: 'user-1',
        childId: 'child-1',
        planDate: '2026-03-10',
        version: 1,
        status: 'active',
        source: 'generated',
        generatedFromGoalIds: ['goal-1'],
        generatedFromMemoryFactIds: [],
        generatedFromConversationSummaryIds: ['summary-1'],
        createdAt: '2026-03-10T07:00:00.000Z',
        updatedAt: '2026-03-10T07:00:00.000Z',
        items: [
          {
            id: 'item-1',
            title: 'Breakfast prompt',
            description: 'Practice a two-word request at breakfast.',
            source: 'goal',
            timeOfDay: 'morning',
            recommendedDurationMinutes: 10,
            completed: true,
            completedAt: '2026-03-10T08:00:00.000Z',
            linkedGoalIds: ['goal-1'],
            launchJuniorDomain: 'speech',
          },
        ],
      },
    ];

    const summaries: ConversationSummary[] = [
      {
        id: 'summary-1',
        conversationId: 'conv-1',
        userId: 'user-1',
        childId: 'child-1',
        summary: 'Focused on speech practice and transitions.',
        keyTopics: ['communication', 'routines'],
        emotionalTone: 'neutral',
        actionItems: [],
        strategiesMentioned: [],
        createdAt: '2026-03-10T09:00:00.000Z',
      },
    ];

    const weekly = buildCaregiverWeeklySummary({
      childName: 'Maya',
      planSnapshots,
      juniorSessions: [
        { id: 'jr-1', completed: true, coins_earned: 4 },
      ],
      conversationSummaries: summaries,
    });

    expect(weekly.weekOf).toBe('2026-03-10');
    expect(weekly.activitiesCompleted).toBe(2);
    expect(weekly.conversationsCount).toBe(1);
    expect(weekly.highlights.some((entry) => entry.includes('Maya'))).toBe(true);
  });
});

describe('mapCaregiverSummaryToClinicalReportData', () => {
  it('maps a stored caregiver summary into the PDF report contract', () => {
    const summary: CaregiverSummary = {
      id: 'caregiver-summary-1',
      userId: 'user-1',
      childId: 'child-1',
      periodStart: '2026-03-04',
      periodEnd: '2026-03-10',
      summaryText: 'Maya completed her speech prompt and had one Junior session.',
      notes: null,
      createdAt: '2026-03-10T12:00:00.000Z',
      updatedAt: '2026-03-10T12:00:00.000Z',
      sourcePlanSnapshotIds: ['plan-1'],
      sourceConversationSummaryIds: ['summary-1'],
      snapshot: {
        generatedAt: '2026-03-10T12:00:00.000Z',
        child: {
          id: 'child-1',
          name: 'Maya Rivera',
          age: 6,
          diagnoses: ['Autism'],
          challenges: ['Bedtime transitions'],
          strengths: ['Music'],
        },
        period: {
          start: '2026-03-04',
          end: '2026-03-10',
        },
        plans: [
          {
            id: 'plan-1',
            userId: 'user-1',
            childId: 'child-1',
            planDate: '2026-03-10',
            version: 1,
            status: 'active',
            source: 'generated',
            generatedFromGoalIds: ['goal-1'],
            generatedFromMemoryFactIds: [],
            generatedFromConversationSummaryIds: ['summary-1'],
            createdAt: '2026-03-10T07:00:00.000Z',
            updatedAt: '2026-03-10T07:00:00.000Z',
            items: [
              {
                id: 'item-1',
                title: 'Breakfast prompt',
                description: 'Practice a two-word request at breakfast.',
                source: 'goal',
                timeOfDay: 'morning',
                recommendedDurationMinutes: 10,
                completed: true,
                completedAt: '2026-03-10T08:00:00.000Z',
                linkedGoalIds: ['goal-1'],
                launchJuniorDomain: 'speech',
              },
            ],
          },
        ],
        juniorSessions: [
          {
            id: 'jr-1',
            activityName: 'Sound Match',
            domain: 'speech',
            completedAt: '2026-03-10T09:00:00.000Z',
            durationSeconds: 600,
            tokensEarned: 4,
            accuracy: 92,
          },
        ],
        conversationSummaries: [
          {
            id: 'summary-1',
            summary: 'Focused on speech practice and transitions.',
            topics: ['communication', 'routines'],
            createdAt: '2026-03-10T09:00:00.000Z',
          },
        ],
        weeklySummary: {
          weekOf: '2026-03-10',
          overallProgress: 75,
          progressTrend: 'up',
          highlights: ['Maya completed one plan item.'],
          challenges: ['Bedtime transitions still need support.'],
          recommendations: ['Keep using the bedtime visual schedule.'],
          goalsProgress: [{ name: 'Breakfast prompt', progress: 100, trend: 'up' }],
          moodPattern: 'positive',
          streakDays: 3,
          activitiesCompleted: 2,
          conversationsCount: 1,
        },
      },
    };

    const report = mapCaregiverSummaryToClinicalReportData(summary);

    expect(report.child.firstName).toBe('Maya');
    expect(report.reportPeriod.start).toBe('2026-03-04');
    expect(report.treatmentPlan.goals).toHaveLength(1);
    expect(report.sessions.totalSessions).toBe(1);
    expect(report.parentReport.concerns[0]).toContain('Bedtime transitions');
    expect(report.recommendations[0]).toContain('visual schedule');
  });
});
