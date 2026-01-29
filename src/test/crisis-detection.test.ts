/**
 * Crisis Detection System Tests
 * Tests for multi-layer crisis detection with safety-first approach
 */

import { describe, it, expect } from 'vitest';
import {
  detectCrisis,
  generateCrisisResponse,
  CRISIS_RESOURCES,
  type CrisisType,
  type CrisisDetectionResult,
} from '../lib/crisis-detection';

describe('Crisis Detection', () => {
  describe('Suicidal Ideation Detection', () => {
    it('should detect explicit suicidal statements', () => {
      const messages = [
        'I want to end my life',
        'I am going to kill myself',
        'I don\'t want to live anymore',
        'The world would be better without me',
      ];

      for (const message of messages) {
        const result = detectCrisis(message);
        expect(result.isCrisis).toBe(true);
        expect(result.type).toBe('suicidal_ideation');
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      }
    });

    it('should have high confidence for planning language', () => {
      const result = detectCrisis('I have a plan to end it tonight');
      expect(result.isCrisis).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.escalationTier).toBe('critical');
    });

    it('should provide 988 resources for suicidal ideation', () => {
      const result = detectCrisis('I want to die');
      expect(result.resources.length).toBeGreaterThan(0);
      expect(result.resources.some(r => r.phone === '988')).toBe(true);
    });
  });

  describe('Self-Harm Detection', () => {
    it('should detect self-harm statements', () => {
      const messages = [
        'I have been cutting myself',
        'I want to hurt myself',
        'I burned myself on purpose',
      ];

      for (const message of messages) {
        const result = detectCrisis(message);
        expect(result.isCrisis).toBe(true);
        expect(result.type).toBe('self_harm');
      }
    });
  });

  describe('Child Safety Detection', () => {
    it('should detect child safety concerns', () => {
      const messages = [
        'I am afraid I might hurt my child',
        'I want to shake the baby',
        'I am scared I will harm my son',
      ];

      for (const message of messages) {
        const result = detectCrisis(message);
        expect(result.isCrisis).toBe(true);
        expect(result.type).toBe('child_safety');
        expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      }
    });

    it('should provide Childhelp resources for child safety', () => {
      const result = detectCrisis('I am afraid I might hurt my child');
      expect(result.resources.some(r => r.name.includes('Childhelp'))).toBe(true);
    });
  });

  describe('Domestic Violence Detection', () => {
    it('should detect domestic violence situations', () => {
      const messages = [
        'My husband is hitting me',
        'I am being abused at home',
        'My partner beats me',
      ];

      for (const message of messages) {
        const result = detectCrisis(message);
        expect(result.isCrisis).toBe(true);
        expect(result.type).toBe('domestic_violence');
      }
    });

    it('should provide DV hotline resources', () => {
      const result = detectCrisis('My partner is abusing me');
      expect(result.resources.some(r => r.name.includes('Domestic Violence'))).toBe(true);
    });
  });

  describe('Caregiver Burnout Detection', () => {
    it('should detect severe caregiver burnout', () => {
      const messages = [
        'I can\'t do this anymore',
        'I am completely burned out',
        'I am at my breaking point with my child',
      ];

      for (const message of messages) {
        const result = detectCrisis(message);
        expect(result.isCrisis).toBe(true);
        expect(result.type).toBe('caregiver_burnout');
      }
    });

    it('should have lower confidence than crisis types', () => {
      const result = detectCrisis('I am exhausted and can\'t take it anymore');
      expect(result.isCrisis).toBe(true);
      // Burnout starts at lower confidence
      expect(result.confidence).toBeLessThan(0.85);
    });
  });

  describe('Mental Health Crisis Detection', () => {
    it('should detect mental health emergencies', () => {
      const messages = [
        'I am having a mental breakdown',
        'I feel completely hopeless',
        'I am hearing voices',
      ];

      for (const message of messages) {
        const result = detectCrisis(message);
        expect(result.isCrisis).toBe(true);
        expect(result.type).toBe('mental_health_crisis');
      }
    });
  });

  describe('Medical Emergency Detection', () => {
    it('should detect medical emergencies', () => {
      const messages = [
        'My child overdosed',
        'The baby is not breathing',
        'My child is having a seizure',
      ];

      for (const message of messages) {
        const result = detectCrisis(message);
        expect(result.isCrisis).toBe(true);
        expect(result.type).toBe('medical_emergency');
        expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      }
    });

    it('should provide 911 for medical emergencies', () => {
      const result = detectCrisis('My child is choking');
      expect(result.resources.some(r => r.phone === '911')).toBe(true);
    });
  });

  describe('Non-Crisis Detection', () => {
    it('should not flag normal parenting stress', () => {
      const messages = [
        'Parenting is hard today',
        'I am tired from lack of sleep',
        'My child is having tantrums',
        'We had a difficult morning routine',
        'I need some advice about bedtime',
      ];

      for (const message of messages) {
        const result = detectCrisis(message);
        expect(result.isCrisis).toBe(false);
      }
    });

    it('should not flag media references', () => {
      const result = detectCrisis('In the movie, the character wanted to die');
      // Should still detect but with reduced confidence
      if (result.isCrisis) {
        expect(result.confidence).toBeLessThan(0.7);
      }
    });

    it('should not flag historical references', () => {
      const result = detectCrisis('Years ago I struggled with depression');
      // Should detect but with reduced confidence for past tense
      if (result.isCrisis) {
        expect(result.matchedPatterns.some(p => p.includes('historical'))).toBe(true);
      }
    });
  });

  describe('Contextual Modifiers', () => {
    it('should increase confidence for immediacy', () => {
      const baseResult = detectCrisis('I want to end it');
      const urgentResult = detectCrisis('I want to end it tonight');

      expect(urgentResult.confidence).toBeGreaterThan(baseResult.confidence);
    });

    it('should increase confidence for isolation', () => {
      const baseResult = detectCrisis('I want to die');
      const isolatedResult = detectCrisis('I want to die and no one cares');

      expect(isolatedResult.confidence).toBeGreaterThan(baseResult.confidence);
    });

    it('should decrease confidence for hypothetical language', () => {
      const directResult = detectCrisis('I want to hurt myself');
      const hypotheticalResult = detectCrisis('Hypothetically, what if someone wanted to hurt themselves');

      if (hypotheticalResult.isCrisis) {
        expect(hypotheticalResult.confidence).toBeLessThan(directResult.confidence);
      }
    });
  });

  describe('Escalation Tiers', () => {
    it('should assign critical tier for high confidence', () => {
      const result = detectCrisis('I am going to kill myself tonight');
      expect(result.escalationTier).toBe('critical');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should assign high tier for elevated confidence', () => {
      const result = detectCrisis('I feel like hurting myself');
      expect(['high', 'critical']).toContain(result.escalationTier);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should recommend appropriate actions for each tier', () => {
      const criticalResult = detectCrisis('I am going to end my life now');
      expect(criticalResult.recommendedAction).toContain('modal');

      const lowResult = detectCrisis('I am feeling down today');
      if (!lowResult.isCrisis) {
        expect(lowResult.recommendedAction).toContain('No crisis');
      }
    });
  });
});

describe('Crisis Response Generation', () => {
  it('should generate response for suicidal ideation', () => {
    const result: CrisisDetectionResult = {
      isCrisis: true,
      type: 'suicidal_ideation',
      confidence: 0.9,
      escalationTier: 'critical',
      matchedPatterns: ['want to die'],
      recommendedAction: 'Show crisis modal',
      resources: CRISIS_RESOURCES.suicidal_ideation,
    };

    const response = generateCrisisResponse(result);
    expect(response).toContain('988');
    expect(response).toContain('not alone');
    expect(response.length).toBeGreaterThan(100);
  });

  it('should generate response for child safety', () => {
    const result: CrisisDetectionResult = {
      isCrisis: true,
      type: 'child_safety',
      confidence: 0.9,
      escalationTier: 'critical',
      matchedPatterns: ['hurt my child'],
      recommendedAction: 'Show crisis modal',
      resources: CRISIS_RESOURCES.child_safety,
    };

    const response = generateCrisisResponse(result);
    expect(response).toContain('Childhelp');
    expect(response).toContain('911');
  });

  it('should return empty string for non-crisis', () => {
    const result: CrisisDetectionResult = {
      isCrisis: false,
      confidence: 0,
      escalationTier: 'low',
      matchedPatterns: [],
      recommendedAction: 'No crisis',
      resources: [],
    };

    const response = generateCrisisResponse(result);
    expect(response).toBe('');
  });
});

describe('Crisis Resources', () => {
  it('should have resources for all crisis types', () => {
    const crisisTypes: CrisisType[] = [
      'suicidal_ideation',
      'self_harm',
      'child_safety',
      'domestic_violence',
      'caregiver_burnout',
      'mental_health_crisis',
      'medical_emergency',
    ];

    for (const type of crisisTypes) {
      const resources = CRISIS_RESOURCES[type];
      expect(resources).toBeDefined();
      expect(resources.length).toBeGreaterThan(0);
    }
  });

  it('should have 24/7 availability for critical resources', () => {
    // Suicidal ideation should have 24/7 resources
    const suicidalResources = CRISIS_RESOURCES.suicidal_ideation;
    expect(suicidalResources.some(r => r.available === '24/7')).toBe(true);

    // Medical emergency should have 24/7 resources
    const medicalResources = CRISIS_RESOURCES.medical_emergency;
    expect(medicalResources.some(r => r.available === '24/7')).toBe(true);
  });

  it('should have phone numbers for all critical resources', () => {
    const criticalTypes: CrisisType[] = [
      'suicidal_ideation',
      'medical_emergency',
      'child_safety',
    ];

    for (const type of criticalTypes) {
      const resources = CRISIS_RESOURCES[type];
      expect(resources.some(r => r.phone !== undefined)).toBe(true);
    }
  });
});

describe('Edge Cases', () => {
  it('should handle empty messages', () => {
    const result = detectCrisis('');
    expect(result.isCrisis).toBe(false);
  });

  it('should handle very long messages', () => {
    const longMessage = 'I am feeling ' + 'really '.repeat(1000) + 'overwhelmed and want to end it all';
    const result = detectCrisis(longMessage);
    expect(result.isCrisis).toBe(true);
  });

  it('should handle mixed case', () => {
    const result = detectCrisis('I WANT TO KILL MYSELF');
    expect(result.isCrisis).toBe(true);
    expect(result.type).toBe('suicidal_ideation');
  });

  it('should handle typos and variations', () => {
    // Note: Regex may miss typos, this tests what we do catch
    const result = detectCrisis('i wanna die');
    // May or may not catch depending on pattern
    if (result.isCrisis) {
      expect(result.type).toBe('suicidal_ideation');
    }
  });
});
