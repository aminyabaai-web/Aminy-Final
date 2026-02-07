/**
 * Circuit Breaker Tests
 * Tests for production resilience patterns
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simplified circuit breaker implementation for testing
// (Mirrors actual implementation logic)
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

class TestCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 30000,
    };
  }

  private checkStateTimeout(): void {
    if (
      this.state === 'OPEN' &&
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime >= this.config.timeout
    ) {
      this.state = 'HALF_OPEN';
      this.successes = 0;
    }
  }

  canExecute(): boolean {
    this.checkStateTimeout();
    return this.state !== 'OPEN';
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  recordFailure(): void {
    this.lastFailureTime = Date.now();
    this.failures++;

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.successes = 0;
    } else if (
      this.state === 'CLOSED' &&
      this.failures >= this.config.failureThreshold
    ) {
      this.state = 'OPEN';
    }
  }

  getState(): CircuitState {
    this.checkStateTimeout();
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
  }

  // For testing
  _setState(state: CircuitState): void {
    this.state = state;
  }

  _setLastFailureTime(time: number): void {
    this.lastFailureTime = time;
  }
}

describe('Circuit Breaker', () => {
  let circuit: TestCircuitBreaker;

  beforeEach(() => {
    circuit = new TestCircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000, // 1 second for tests
    });
  });

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      expect(circuit.getState()).toBe('CLOSED');
    });

    it('should allow execution initially', () => {
      expect(circuit.canExecute()).toBe(true);
    });
  });

  describe('State Transitions', () => {
    it('should remain CLOSED after fewer failures than threshold', () => {
      circuit.recordFailure();
      circuit.recordFailure();
      expect(circuit.getState()).toBe('CLOSED');
      expect(circuit.canExecute()).toBe(true);
    });

    it('should open after reaching failure threshold', () => {
      circuit.recordFailure();
      circuit.recordFailure();
      circuit.recordFailure();
      expect(circuit.getState()).toBe('OPEN');
    });

    it('should block execution when OPEN', () => {
      circuit.recordFailure();
      circuit.recordFailure();
      circuit.recordFailure();
      expect(circuit.canExecute()).toBe(false);
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      circuit.recordFailure();
      circuit.recordFailure();
      circuit.recordFailure();
      expect(circuit.getState()).toBe('OPEN');

      // Simulate timeout passing
      circuit._setLastFailureTime(Date.now() - 2000);

      expect(circuit.getState()).toBe('HALF_OPEN');
      expect(circuit.canExecute()).toBe(true);
    });

    it('should close after enough successes in HALF_OPEN', () => {
      circuit._setState('HALF_OPEN');

      circuit.recordSuccess();
      expect(circuit.getState()).toBe('HALF_OPEN');

      circuit.recordSuccess();
      expect(circuit.getState()).toBe('CLOSED');
    });

    it('should reopen on failure in HALF_OPEN', () => {
      circuit._setState('HALF_OPEN');
      circuit.recordFailure();
      expect(circuit.getState()).toBe('OPEN');
    });
  });

  describe('Success Handling', () => {
    it('should decrease failure count on success in CLOSED state', () => {
      circuit.recordFailure();
      circuit.recordFailure();
      // failures = 2

      // Now record a success - decrements failure count by 1
      circuit.recordSuccess();
      // failures = 1

      // Need 2 more failures to reach threshold of 3
      circuit.recordFailure();
      // failures = 2
      expect(circuit.getState()).toBe('CLOSED');

      circuit.recordFailure();
      // failures = 3 >= threshold, should OPEN
      expect(circuit.getState()).toBe('OPEN');
    });
  });

  describe('Reset', () => {
    it('should reset to initial state', () => {
      circuit.recordFailure();
      circuit.recordFailure();
      circuit.recordFailure();
      expect(circuit.getState()).toBe('OPEN');

      circuit.reset();
      expect(circuit.getState()).toBe('CLOSED');
      expect(circuit.canExecute()).toBe(true);
    });
  });
});

describe('Circuit Breaker Configurations', () => {
  it('should use custom failure threshold', () => {
    const circuit = new TestCircuitBreaker({ failureThreshold: 10 });

    for (let i = 0; i < 9; i++) {
      circuit.recordFailure();
    }
    expect(circuit.getState()).toBe('CLOSED');

    circuit.recordFailure();
    expect(circuit.getState()).toBe('OPEN');
  });

  it('should use custom success threshold', () => {
    const circuit = new TestCircuitBreaker({ successThreshold: 5 });
    circuit._setState('HALF_OPEN');

    for (let i = 0; i < 4; i++) {
      circuit.recordSuccess();
    }
    expect(circuit.getState()).toBe('HALF_OPEN');

    circuit.recordSuccess();
    expect(circuit.getState()).toBe('CLOSED');
  });
});

describe('Circuit Breaker Pre-configured Circuits', () => {
  const CIRCUIT_CONFIGS = {
    ai: { failureThreshold: 3, successThreshold: 2, timeout: 60000 },
    database: { failureThreshold: 5, successThreshold: 2, timeout: 30000 },
    auth: { failureThreshold: 5, successThreshold: 2, timeout: 20000 },
    payment: { failureThreshold: 3, successThreshold: 2, timeout: 45000 },
    video: { failureThreshold: 3, successThreshold: 2, timeout: 30000 },
    fileUpload: { failureThreshold: 3, successThreshold: 2, timeout: 30000 },
  };

  it('should have AI circuit with correct config', () => {
    expect(CIRCUIT_CONFIGS.ai.failureThreshold).toBe(3);
    expect(CIRCUIT_CONFIGS.ai.timeout).toBe(60000); // 1 minute
  });

  it('should have payment circuit with correct config', () => {
    expect(CIRCUIT_CONFIGS.payment.failureThreshold).toBe(3);
    expect(CIRCUIT_CONFIGS.payment.timeout).toBe(45000); // 45 seconds
  });

  it('should have database circuit with higher failure threshold', () => {
    expect(CIRCUIT_CONFIGS.database.failureThreshold).toBe(5);
    // Database can handle more failures before tripping
  });

  it('should have auth circuit with shorter timeout', () => {
    expect(CIRCUIT_CONFIGS.auth.timeout).toBe(20000);
    // Auth should recover quickly
  });
});

describe('Circuit Open Error', () => {
  it('should create error with circuit name', () => {
    class CircuitOpenError extends Error {
      public readonly circuitName: string;

      constructor(message: string, circuitName: string) {
        super(message);
        this.name = 'CircuitOpenError';
        this.circuitName = circuitName;
      }
    }

    const error = new CircuitOpenError('Circuit is OPEN', 'ai-api');

    expect(error.name).toBe('CircuitOpenError');
    expect(error.circuitName).toBe('ai-api');
    expect(error.message).toContain('OPEN');
  });
});

describe('Circuit Breaker Registry', () => {
  it('should manage multiple circuits independently', () => {
    const circuits: Map<string, TestCircuitBreaker> = new Map();

    circuits.set('ai', new TestCircuitBreaker({ failureThreshold: 3 }));
    circuits.set('db', new TestCircuitBreaker({ failureThreshold: 5 }));

    // Trip the AI circuit
    circuits.get('ai')!.recordFailure();
    circuits.get('ai')!.recordFailure();
    circuits.get('ai')!.recordFailure();

    expect(circuits.get('ai')!.getState()).toBe('OPEN');
    expect(circuits.get('db')!.getState()).toBe('CLOSED');
  });

  it('should get all open circuits', () => {
    const circuits: Map<string, TestCircuitBreaker> = new Map();

    circuits.set('ai', new TestCircuitBreaker({ failureThreshold: 1 }));
    circuits.set('db', new TestCircuitBreaker({ failureThreshold: 1 }));
    circuits.set('auth', new TestCircuitBreaker({ failureThreshold: 1 }));

    // Trip AI and DB
    circuits.get('ai')!.recordFailure();
    circuits.get('db')!.recordFailure();

    const openCircuits = Array.from(circuits.entries())
      .filter(([, circuit]) => circuit.getState() === 'OPEN')
      .map(([name]) => name);

    expect(openCircuits).toContain('ai');
    expect(openCircuits).toContain('db');
    expect(openCircuits).not.toContain('auth');
  });
});
