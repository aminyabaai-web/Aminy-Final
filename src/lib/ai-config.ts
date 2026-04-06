// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

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
