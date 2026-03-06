// Aminy MVP - Sample Seed Data for Connector Hub Demo
// Complete data set to demonstrate the full Connector loop

import { SeedData, Child, Plan, ConnectorSession, InsightSnapshot, CoverageCase, Device, JrProfile, ConnectorReport } from '../types/connector';

export const seedData: SeedData = {
  caregivers: [
    {
      id: 'caregiver-1',
      name: 'Amy Rodriguez',
      email: 'amy.rodriguez@email.com',
      state: 'California',
      insurance: 'Blue Cross Blue Shield',
      createdAt: new Date('2024-01-15'),
      lastActiveAt: new Date()
    }
  ],

  children: [
    {
      id: 'child-1',
      name: 'Eddie',
      dateOfBirth: new Date('2019-06-12'),
      locale: 'en-US',
      dx_flags: ['speech_delay', 'social_communication'],
      interests: ['music', 'animals', 'bubbles', 'trains'],
      triggers: ['loud_noises', 'sudden_changes', 'crowded_spaces'],
      caregiverId: 'caregiver-1',
      createdAt: new Date('2024-01-15')
    }
  ],

  devices: [
    {
      id: 'device-1',
      childId: 'child-1',
      platform: 'ios',
      lastSeenAt: new Date(),
      name: 'Eddie\'s iPad',
      deviceToken: 'mock-device-token-123'
    }
  ],

  jrProfiles: [
    {
      childId: 'child-1',
      speechLevel: 'developing',
      targetSetId: 'speech-set-intermediate',
      fatigueRules: {
        maxSessionMinutes: 15,
        breakAfterErrors: 3,
        cooldownMinutes: 10
      },
      calibration: {
        difficulty: 3, // 1-5 scale
        preferredActivities: ['bubble_pop', 'animal_sounds', 'color_matching'],
        motivators: ['stickers', 'music', 'praise']
      },
      lastUpdated: new Date('2024-12-10')
    }
  ],

  plans: [
    {
      childId: 'child-1',
      version: 'v1.2',
      goals: [
        {
          id: 'goal-1',
          domain: 'speech',
          title: 'Two-word phrases',
          description: 'Use two-word combinations in daily routines',
          targetBehavior: 'Spontaneous two-word phrases during play',
          timeline: 'daily',
          status: 'active',
          progress: 73
        },
        {
          id: 'goal-2',
          domain: 'social',
          title: 'Eye contact during requests',
          description: 'Maintain eye contact when making requests',
          targetBehavior: '3+ seconds eye contact per request',
          timeline: 'daily',
          status: 'active',
          progress: 56
        },
        {
          id: 'goal-3',
          domain: 'sensory',
          title: 'Tolerate new textures',
          description: 'Explore different textures during play',
          targetBehavior: 'Touch new texture for 30+ seconds',
          timeline: 'weekly',
          status: 'active',
          progress: 89
        }
      ],
      dailyTasks: [
        {
          id: 'task-1',
          goalId: 'goal-1',
          title: 'Morning phrase practice',
          description: 'Practice "want milk", "more please" during breakfast',
          estimatedMinutes: 10,
          completed: true,
          completedAt: new Date(),
          notes: 'Great progress with "want milk"!'
        },
        {
          id: 'task-2',
          goalId: 'goal-2',
          title: 'Request game',
          description: 'Practice requesting during preferred activities',
          estimatedMinutes: 15,
          completed: false
        },
        {
          id: 'task-3',
          goalId: 'goal-3',
          title: 'Texture exploration',
          description: 'Play with playdough, rice, or water beads',
          estimatedMinutes: 10,
          completed: true,
          completedAt: new Date(),
          notes: 'Loved the rice sensory bin today'
        }
      ],
      reinforcement: {
        type: 'visual',
        frequency: 'immediate',
        preferences: ['sticker_charts', 'high_fives', 'favorite_songs']
      },
      generatedAt: new Date('2024-12-01'),
      lastUpdated: new Date('2024-12-10')
    }
  ],

  sessions: [
    // Jr sessions
    {
      id: 'session-jr-1',
      childId: 'child-1',
      type: 'jr',
      minutes: 12,
      targets: ['two_word_phrases', 'animal_sounds', 'color_names'],
      accuracy: 78,
      errors: ['pronunciation_animal_cow', 'sequence_color_red'],
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      metadata: {
        fatigueLevel: 'low'
      }
    },
    {
      id: 'session-jr-2',
      childId: 'child-1',
      type: 'jr',
      minutes: 8,
      targets: ['eye_contact', 'turn_taking'],
      accuracy: 85,
      errors: ['duration_eye_contact'],
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      metadata: {
        fatigueLevel: 'medium'
      }
    },
    // Parent sessions
    {
      id: 'session-parent-1',
      childId: 'child-1',
      type: 'parent',
      minutes: 5,
      targets: ['daily_checkin'],
      notes: 'Eddie had a great morning! Used "want milk" three times during breakfast. Still working on eye contact during requests.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      metadata: {
        conversationLength: 2,
        mediaUploaded: ['breakfast_video.mp4']
      }
    }
  ],

  insights: [
    {
      childId: 'child-1',
      screeners: [
        {
          name: 'M-CHAT-R',
          score: 7,
          completedAt: new Date('2024-11-20')
        },
        {
          name: 'Communication Screener',
          score: 12,
          completedAt: new Date('2024-11-25')
        }
      ],
      flags: [
        {
          type: 'speech_delay',
          severity: 'medium',
          description: 'Limited two-word combinations for age'
        },
        {
          type: 'social_communication',
          severity: 'low',
          description: 'Emerging joint attention skills'
        }
      ],
      confidence: 82,
      recommendations: [
        'Continue focus on two-word phrase expansion',
        'Increase opportunities for turn-taking games',
        'Consider adding visual supports to routines'
      ],
      generatedAt: new Date('2024-11-25'),
      version: 'v2.1'
    }
  ],

  coverage: [
    {
      childId: 'child-1',
      state: 'California',
      insurer: 'Blue Cross Blue Shield',
      dx_present: false, // No formal diagnosis yet
      telehealth_eligible: true,
      status: 'approved',
      eligibilityCheckedAt: new Date('2024-11-30'),
      benefits: {
        sessionsPerYear: 26,
        copayAmount: 25,
        deductibleMet: false
      }
    }
  ],

  referrals: [
    {
      id: 'referral-1',
      childId: 'child-1',
      providerId: 'provider-speech-1',
      route: 'directory',
      timestamp: new Date('2024-12-05'),
      status: 'acknowledged',
      metadata: {
        providerName: 'Bay Area Speech Therapy',
        specialty: 'Pediatric Speech-Language Pathology',
        contactMethod: 'patient_portal'
      }
    }
  ],

  reports: [
    {
      id: 'report-1',
      childId: 'child-1',
      type: 'core',
      period: {
        startDate: new Date('2024-11-01'),
        endDate: new Date('2024-11-30')
      },
      adherence: 85, // 85% of tasks completed
      dosageMinutes: 245, // Weekly average
      goalSuccess: 72, // Average progress across goals
      incidentsPerWeek: 1.2,
      exports: [
        {
          format: 'pdf',
          generatedAt: new Date('2024-12-01'),
          downloadUrl: '/reports/child-1-november-2024.pdf'
        }
      ],
      generatedAt: new Date('2024-12-01')
    }
  ]
};

// Helper function to get current connector status from seed data
export const getCurrentConnectorStatus = () => {
  const device = seedData.devices[0];
  const insight = seedData.insights[0];
  const coverage = seedData.coverage[0];
  
  return {
    device: {
      paired: !!device,
      deviceName: device?.name,
      lastSeen: device?.lastSeenAt
    },
    insight: {
      completed: !!insight,
      confidence: insight?.confidence,
      lastUpdated: insight?.generatedAt
    },
    benefits: {
      eligible: coverage?.telehealth_eligible || false,
      status: coverage?.status,
      checkedAt: coverage?.eligibilityCheckedAt
    },
    providers: {
      available: coverage?.telehealth_eligible || false,
      count: coverage?.telehealth_eligible ? 12 : 0
    }
  };
};

// Helper to simulate real-time updates
export const simulateConnectorEvents = () => {
  const { connectorActions } = require('./connector-hub');
  
  // Simulate a Jr session completing in 30 seconds
  setTimeout(() => {
    connectorActions.completeJrSession({
      childId: 'child-1',
      minutes: 8,
      targets: ['two_word_phrases', 'turn_taking'],
      accuracy: 82,
      errors: ['pronunciation_difficult_words']
    });
  }, 30000);
  
  // Simulate parent checkin in 45 seconds
  setTimeout(() => {
    connectorActions.logParentCheckin({
      childId: 'child-1',
      type: 'daily_update',
      minutes: 3,
      notes: 'Great progress today! Eddie used new phrases during lunch.',
      mediaRefs: ['lunch_interaction.mp4']
    });
  }, 45000);
};

export default seedData;