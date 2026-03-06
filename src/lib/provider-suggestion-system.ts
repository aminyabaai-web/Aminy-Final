/**
 * Provider Suggestion System - Stub for MVP merge
 */

export interface ProviderSuggestion {
    id: string;
    providerId: string;
    providerName: string;
    providerRole: string;
    childId: string;
    childName?: string;
    type: 'routine_change' | 'goal_adjustment' | 'prompt_script' | 'reinforcement' | 'environment_change' | 'coverage_note';
    status: 'proposed' | 'accepted' | 'rejected';
    rationale: string;
    expectedOutcome: string;
    createdAt: string;
    reviewedAt?: string;
    payload: Record<string, unknown>;
}

export interface RoutineChangePayload {
    routineName: string;
    changes: Array<{
        field: string;
        before: string;
        after: string;
    }>;
}

export interface GoalAdjustmentPayload {
    goalName: string;
    before: string;
    after: string;
}

export interface PromptScriptPayload {
    situation: string;
    script: string;
    whenToUse?: string;
}

export interface ReinforcementPayload {
    behavior: string;
    reinforcer: string;
    schedule: string;
}

export class ProviderSuggestionEngine {
    constructor(providerId: string, providerName: string, providerRole: string) { }

    async getPendingSuggestions(childId: string): Promise<ProviderSuggestion[]> {
        return [];
    }

    async acceptSuggestion(suggestionId: string): Promise<{ success: boolean }> {
        return { success: true };
    }

    async rejectSuggestion(suggestionId: string): Promise<void> { }

    async undoAcceptance(suggestionId: string): Promise<boolean> {
        return true;
    }
}
