// Aminy MVP - Connector Hub Event Bus
// Lightweight publish/subscribe system for module integration

import { ConnectorEvent, EventHandler } from '../types/connector';

class ConnectorHub {
  private listeners: Map<string, EventHandler[]> = new Map();
  private events: ConnectorEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events for debugging

  // Subscribe to events
  subscribe(eventName: string, handler: EventHandler): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    const handlers = this.listeners.get(eventName)!;
    handlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  // Publish events
  publish(eventName: string, payload: unknown, source: string = 'unknown'): void {
    const event: ConnectorEvent = {
      type: eventName,
      payload,
      timestamp: new Date(),
      source
    };

    // Store event for debugging/replay
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Notify listeners
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error);
        }
      });
    }

    // Log for development
    if (process.env.NODE_ENV === 'development') {
    }
  }

  // Get event history
  getEvents(eventType?: string): ConnectorEvent[] {
    if (eventType) {
      return this.events.filter(event => event.type === eventType);
    }
    return [...this.events];
  }

  // Clear event history
  clearEvents(): void {
    this.events = [];
  }

  // Get active listeners count
  getListenerCount(eventType?: string): number {
    if (eventType) {
      return this.listeners.get(eventType)?.length || 0;
    }
    return Array.from(this.listeners.values()).reduce((total, handlers) => total + handlers.length, 0);
  }
}

// Global singleton instance
export const connectorHub = new ConnectorHub();

// Event name constants
export const CONNECTOR_EVENTS = {
  // Device events
  DEVICE_PAIRED: 'device.paired',
  DEVICE_REVOKED: 'device.revoked',
  
  // Jr Mode events
  JR_SESSION_COMPLETED: 'jr.session.completed',
  JR_FATIGUE_DETECTED: 'jr.fatigue.detected',
  JR_MILESTONE_REACHED: 'jr.milestone.reached',
  
  // Parent events
  PARENT_CHECKIN_LOGGED: 'parent.checkin.logged',
  PARENT_TASK_COMPLETED: 'parent.task.completed',
  PARENT_MEDIA_UPLOADED: 'parent.media.uploaded',
  
  // Insight events
  INSIGHT_UPDATED: 'insight.updated',
  INSIGHT_COMPLETED: 'insight.completed',
  INSIGHT_FLAG_RAISED: 'insight.flag.raised',
  
  // Coverage events
  COVERAGE_UPDATED: 'coverage.updated',
  COVERAGE_APPROVED: 'coverage.approved',
  COVERAGE_DENIED: 'coverage.denied',
  
  // Referral events
  REFERRAL_SENT: 'referral.sent',
  REFERRAL_SCHEDULED: 'referral.scheduled',
  REFERRAL_COMPLETED: 'referral.completed',
  
  // Report events
  REPORT_GENERATED: 'report.generated',
  REPORT_EXPORTED: 'report.exported',
  REPORT_SHARED: 'report.shared',
  
  // Plan events
  PLAN_GENERATED: 'plan.generated',
  PLAN_UPDATED: 'plan.updated',
  PLAN_GOAL_COMPLETED: 'plan.goal.completed',
  
  // AI Assistant events
  ASSISTANT_ACTION: 'assistant.action',
  
  // Vault events
  VAULT_RECORD_ADDED: 'vault.record.added',
  VAULT_RECORD_INDEXED: 'vault.record.indexed', 
  VAULT_CITATION: 'vault.citation',
  VAULT_ATTACHED_TO_EXPORT: 'vault.attached_to_export'
} as const;

// Helper functions for common event patterns
export const connectorActions = {
  // Device actions
  pairDevice: (deviceData: { childId: string; platform: string; name: string }) => {
    connectorHub.publish(CONNECTOR_EVENTS.DEVICE_PAIRED, deviceData, 'device-manager');
  },

  // Jr session actions
  completeJrSession: (sessionData: { 
    childId: string; 
    minutes: number; 
    targets: string[]; 
    accuracy: number; 
    errors: string[] 
  }) => {
    connectorHub.publish(CONNECTOR_EVENTS.JR_SESSION_COMPLETED, sessionData, 'jr-mode');
  },

  // Parent checkin actions
  logParentCheckin: (checkinData: { 
    childId: string; 
    type: string; 
    minutes: number; 
    notes?: string;
    mediaRefs?: string[] 
  }) => {
    connectorHub.publish(CONNECTOR_EVENTS.PARENT_CHECKIN_LOGGED, checkinData, 'talk-to-aminy');
  },

  // Insight actions
  updateInsight: (insightData: { 
    childId: string; 
    confidence: number; 
    flags: string[];
    recommendations: string[] 
  }) => {
    connectorHub.publish(CONNECTOR_EVENTS.INSIGHT_UPDATED, insightData, 'insight-navigator');
  },

  // Coverage actions
  updateCoverage: (coverageData: { 
    childId: string; 
    eligible: boolean; 
    status: string; 
    benefits?: Record<string, unknown>
  }) => {
    connectorHub.publish(CONNECTOR_EVENTS.COVERAGE_UPDATED, coverageData, 'coverage-coach');
  },

  // Report actions
  exportReport: (reportData: {
    childId: string;
    type: string;
    format: string;
    period: { start: string; end: string }
  }) => {
    connectorHub.publish(CONNECTOR_EVENTS.REPORT_EXPORTED, reportData, 'reports-center');
  },

  // Outcome logging
  logOutcome: (outcomeData: {
    childId: string;
    type: string;
    subtype?: string;
    value?: number;
    metadata?: Record<string, unknown>;
  }) => {
    connectorHub.publish('outcome.logged', outcomeData, 'sensory-tools');
  }
};

// Helper for creating mock events during development
export const createMockEvent = (eventName: string, payload: unknown) => {
  connectorHub.publish(eventName, payload, 'mock-data');
};

export default connectorHub;