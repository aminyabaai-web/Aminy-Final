// Minimal seed data for faster initial loading
import { SeedData } from '../types/connector';

export const minimalSeedData: SeedData = {
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
      interests: ['music', 'animals'],
      triggers: ['loud_noises'],
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
      name: 'Eddie\'s iPad'
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
        cooldownMinutes: 5
      },
      calibration: {
        difficulty: 0.6,
        preferredActivities: ['speech-games'],
        motivators: ['stickers', 'sounds']
      },
      lastUpdated: new Date()
    }
  ],

  plans: [],
  sessions: [],
  insights: [],
  coverage: [],
  referrals: [],
  reports: []
};

// Async function to load full seed data when needed
export async function loadFullSeedData() {
  const { seedData } = await import('./seed-data');
  return seedData;
}

// Placeholder simulation function that loads async
export async function simulateConnectorEvents() {
  const { simulateConnectorEvents: fullSimulation } = await import('./seed-data');
  return fullSimulation();
}