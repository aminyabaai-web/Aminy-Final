// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Circuit Breaker Pattern for Production Resilience
 *
 * Prevents cascading failures by temporarily disabling failing operations.
 * Three states: CLOSED (normal), OPEN (blocking), HALF_OPEN (testing)
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;      // Successes needed to close from half-open
  timeout: number;               // Time in ms before moving from open to half-open
  monitorInterval?: number;      // How often to check state (ms)
  onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
  onFailure?: (error: Error, name: string) => void;
  onSuccess?: (name: string) => void;
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastAttemptTime: number | null;
  totalFailures: number;
  totalSuccesses: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
};

class CircuitBreaker {
  private name: string;
  private config: CircuitBreakerConfig;
  private circuitState: CircuitBreakerState;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.circuitState = {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastAttemptTime: null,
      totalFailures: 0,
      totalSuccesses: 0,
    };
  }

  private setState(newState: CircuitState): void {
    if (this.circuitState.state !== newState) {
      const oldState = this.circuitState.state;
      this.circuitState.state = newState;
      this.config.onStateChange?.(oldState, newState, this.name);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[CircuitBreaker:${this.name}] State changed: ${oldState} -> ${newState}`);
      }
    }
  }

  private checkStateTimeout(): void {
    if (
      this.circuitState.state === 'OPEN' &&
      this.circuitState.lastFailureTime &&
      Date.now() - this.circuitState.lastFailureTime >= this.config.timeout
    ) {
      this.setState('HALF_OPEN');
      this.circuitState.successes = 0;
    }
  }

  /**
   * Check if the circuit allows the operation
   */
  canExecute(): boolean {
    this.checkStateTimeout();
    return this.circuitState.state !== 'OPEN';
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.circuitState.lastAttemptTime = Date.now();
    this.circuitState.totalSuccesses++;
    this.config.onSuccess?.(this.name);

    if (this.circuitState.state === 'HALF_OPEN') {
      this.circuitState.successes++;
      if (this.circuitState.successes >= this.config.successThreshold) {
        this.setState('CLOSED');
        this.circuitState.failures = 0;
        this.circuitState.successes = 0;
      }
    } else if (this.circuitState.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this.circuitState.failures = Math.max(0, this.circuitState.failures - 1);
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(error: Error): void {
    this.circuitState.lastAttemptTime = Date.now();
    this.circuitState.lastFailureTime = Date.now();
    this.circuitState.failures++;
    this.circuitState.totalFailures++;
    this.config.onFailure?.(error, this.name);

    if (this.circuitState.state === 'HALF_OPEN') {
      // Any failure in half-open state opens the circuit
      this.setState('OPEN');
      this.circuitState.successes = 0;
    } else if (
      this.circuitState.state === 'CLOSED' &&
      this.circuitState.failures >= this.config.failureThreshold
    ) {
      this.setState('OPEN');
    }
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new CircuitOpenError(
        `Circuit breaker "${this.name}" is OPEN. Retry after ${this.getTimeUntilRetry()}ms`,
        this.name
      );
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Execute a synchronous operation with circuit breaker protection
   */
  executeSync<T>(operation: () => T): T {
    if (!this.canExecute()) {
      throw new CircuitOpenError(
        `Circuit breaker "${this.name}" is OPEN. Retry after ${this.getTimeUntilRetry()}ms`,
        this.name
      );
    }

    try {
      const result = operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.checkStateTimeout();
    return this.circuitState.state;
  }

  /**
   * Get time until retry is allowed (0 if closed or half-open)
   */
  getTimeUntilRetry(): number {
    if (this.circuitState.state !== 'OPEN' || !this.circuitState.lastFailureTime) {
      return 0;
    }
    const elapsed = Date.now() - this.circuitState.lastFailureTime;
    return Math.max(0, this.config.timeout - elapsed);
  }

  /**
   * Get circuit statistics
   */
  getStats(): {
    name: string;
    state: CircuitState;
    failures: number;
    successes: number;
    totalFailures: number;
    totalSuccesses: number;
    timeUntilRetry: number;
  } {
    return {
      name: this.name,
      state: this.getState(),
      failures: this.circuitState.failures,
      successes: this.circuitState.successes,
      totalFailures: this.circuitState.totalFailures,
      totalSuccesses: this.circuitState.totalSuccesses,
      timeUntilRetry: this.getTimeUntilRetry(),
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.circuitState = {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastAttemptTime: null,
      totalFailures: this.circuitState.totalFailures,
      totalSuccesses: this.circuitState.totalSuccesses,
    };
  }
}

/**
 * Custom error for when circuit is open
 */
export class CircuitOpenError extends Error {
  public readonly circuitName: string;

  constructor(message: string, circuitName: string) {
    super(message);
    this.name = 'CircuitOpenError';
    this.circuitName = circuitName;
  }
}

/**
 * Circuit Breaker Registry - manages multiple circuit breakers
 */
class CircuitBreakerRegistry {
  private circuits: Map<string, CircuitBreaker> = new Map();
  private globalConfig: Partial<CircuitBreakerConfig> = {};

  /**
   * Set global configuration for all new circuit breakers
   */
  setGlobalConfig(config: Partial<CircuitBreakerConfig>): void {
    this.globalConfig = config;
  }

  /**
   * Get or create a circuit breaker
   */
  getCircuit(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuits.has(name)) {
      this.circuits.set(
        name,
        new CircuitBreaker(name, { ...this.globalConfig, ...config })
      );
    }
    return this.circuits.get(name)!;
  }

  /**
   * Get all circuit stats
   */
  getAllStats(): Array<ReturnType<CircuitBreaker['getStats']>> {
    return Array.from(this.circuits.values()).map(circuit => circuit.getStats());
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    this.circuits.forEach(circuit => circuit.reset());
  }

  /**
   * Get circuits that are currently open
   */
  getOpenCircuits(): string[] {
    return Array.from(this.circuits.entries())
      .filter(([, circuit]) => circuit.getState() === 'OPEN')
      .map(([name]) => name);
  }
}

// Singleton registry instance
export const circuitRegistry = new CircuitBreakerRegistry();

// Pre-configured circuit breakers for common operations
export const circuits = {
  ai: circuitRegistry.getCircuit('ai-api', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000, // 1 minute
  }),

  database: circuitRegistry.getCircuit('database', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
  }),

  auth: circuitRegistry.getCircuit('auth', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 20000,
  }),

  payment: circuitRegistry.getCircuit('payment', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 45000,
  }),

  video: circuitRegistry.getCircuit('video-call', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000,
  }),

  fileUpload: circuitRegistry.getCircuit('file-upload', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000,
  }),
};

/**
 * React hook for circuit breaker state
 */
export function useCircuitBreaker(circuitName: string, config?: Partial<CircuitBreakerConfig>) {
  const circuit = circuitRegistry.getCircuit(circuitName, config);

  return {
    canExecute: () => circuit.canExecute(),
    execute: <T>(operation: () => Promise<T>) => circuit.execute(operation),
    executeSync: <T>(operation: () => T) => circuit.executeSync(operation),
    getState: () => circuit.getState(),
    getStats: () => circuit.getStats(),
    reset: () => circuit.reset(),
  };
}

export { CircuitBreaker };
export default circuitRegistry;
