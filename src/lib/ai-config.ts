/**
 * AI Config - Stub
 * Original file was removed. This provides no-op exports to prevent build errors.
 */

export interface AIConfig {
  maxTokens: number;
  temperature: number;
  model?: string;
}

export interface QueryClassification {
  type: string;
  confidence: number;
}

export function getConfigForMessage(
  _message: string
): { config: AIConfig; classification: QueryClassification } {
  return {
    config: {
      maxTokens: 1024,
      temperature: 0.7,
    },
    classification: {
      type: 'general',
      confidence: 1.0,
    },
  };
}
