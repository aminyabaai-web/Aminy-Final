// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Clinical Outcomes - Stub
 * Original file was removed. This provides no-op exports to prevent build errors.
 */

export type AssessmentType =
  | 'MCHAT'
  | 'ASQ'
  | 'PHQ9'
  | 'GAD7'
  | 'CBCL'
  | 'BASC'
  | 'CARS'
  | 'ADOS'
  | 'Vineland'
  | 'ABLLS'
  | 'VB_MAPP'
  | string;

export interface AssessmentInfo {
  name: string;
  lowerIsBetter: boolean;
}

export const ASSESSMENT_INFO: Record<string, AssessmentInfo> = {
  MCHAT: { name: 'M-CHAT-R/F', lowerIsBetter: true },
  ASQ: { name: 'ASQ-3', lowerIsBetter: false },
  PHQ9: { name: 'PHQ-9', lowerIsBetter: true },
  GAD7: { name: 'GAD-7', lowerIsBetter: true },
  CBCL: { name: 'CBCL', lowerIsBetter: true },
  BASC: { name: 'BASC-3', lowerIsBetter: true },
  CARS: { name: 'CARS-2', lowerIsBetter: true },
  ADOS: { name: 'ADOS-2', lowerIsBetter: true },
  Vineland: { name: 'Vineland-3', lowerIsBetter: false },
  ABLLS: { name: 'ABLLS-R', lowerIsBetter: false },
  VB_MAPP: { name: 'VB-MAPP', lowerIsBetter: false },
};
