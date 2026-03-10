/**
 * Clinical Report Generation for Aminy
 *
 * Generates IEP documents, progress reports, BCBA session notes,
 * and insurance coverage letters using the unified AI context.
 *
 * Migrated from aminy-ai-brain.ts during AI module consolidation.
 */

import { projectId, publicAnonKey } from '../../utils/supabase/info';
import type { AminyAIContext } from './rich-context';
import { buildAIContext } from './rich-context';

export type ReportType = 'iep' | 'progress' | 'bcba-notes' | 'coverage-letter';

/**
 * Generate clinical report with full context
 */
export async function generateClinicalReport(
  reportType: ReportType,
  dateRange?: { start: string; end: string }
): Promise<string> {

  const context = await buildAIContext();
  const reportPrompt = buildReportPrompt(reportType, context, dateRange);

  try {
    // Use backend server for report generation
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          userMessage: `Generate a ${reportType} report`,
          conversationHistory: [],
          systemPrompt: reportPrompt
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Report generation failed');
    }

    const data = await response.json();
    return data.message;

  } catch (error) {
    console.error('Report generation error:', error);
    throw error;
  }
}

function buildReportPrompt(
  type: string,
  context: AminyAIContext,
  dateRange?: { start: string; end: string }
): string {

  const telehealthSessionSummary = context.telehealthSessions.length > 0
    ? `\nTELEHEALTH SESSIONS (${context.telehealthSessions.length} completed):\n${context.telehealthSessions.map(s => `
  Date: ${new Date(s.date).toLocaleDateString()}
  Provider: ${s.provider}
  Duration: ${s.duration} minutes
  Topics: ${s.topics.join(', ')}
  Observations: ${s.observations}
  Progress Updates: ${s.progressUpdates.map(p => `${p.area} (${p.status}): ${p.notes}`).join('; ')}
  Recommendations: ${s.recommendations.join('; ')}
`).join('\n')}`
    : '';

  const baseInfo = `
CHILD INFORMATION:
- Name: ${context.child.name}
- Age: ${context.child.age} years
- Diagnoses: ${context.child.diagnoses.join(', ')}
- Current Goals: ${context.child.currentGoals.map(g => `${g.area}: ${g.description} (${g.progress}% complete)`).join('\n  ')}

PROGRESS DATA:
- Activities completed: ${context.dailyPlan.completedToday.length}
- Junior mode engagement: ${context.juniorMode.gamesPlayed.length} sessions
- Skills practiced: ${context.juniorMode.skillsPracticed.join(', ')}
- Parent-reported challenges: ${context.memory.parentConcerns.slice(0, 5).join('; ')}
- Successful strategies: ${context.memory.successfulStrategies.slice(0, 5).map(s => s.description).join('; ')}
${telehealthSessionSummary}
`;

  if (type === 'iep') {
    return `Generate a comprehensive IEP (Individualized Education Program) document for ${context.child.name}.

${baseInfo}

Include:
1. Present Levels of Academic Achievement and Functional Performance (PLAAFP)
2. Annual Goals (SMART format)
3. Special Education Services
4. Accommodations and Modifications
5. Progress Monitoring Plan

Use professional, clinical language appropriate for school teams.`;
  }

  if (type === 'progress') {
    return `Generate a detailed progress report for ${context.child.name} covering ${dateRange ? `${dateRange.start} to ${dateRange.end}` : 'recent period'}.

${baseInfo}

Include:
1. Executive Summary
2. Goal Progress (quantitative and qualitative)
3. Skill Development
4. Behavioral Observations
5. Parent/Caregiver Input
6. Recommendations for Next Period

Use data-driven language with specific examples.`;
  }

  if (type === 'bcba-notes') {
    return `Generate BCBA session notes for ${context.child.name}.

${baseInfo}

Include:
1. Session Date and Duration
2. Target Behaviors
3. Data Collection Results
4. Interventions Used
5. Child Response
6. Parent Training Topics
7. Next Session Plan

Use standard BCBA documentation format.`;
  }

  if (type === 'coverage-letter') {
    return `Generate an insurance coverage letter for ${context.child.name} requesting authorization for ABA therapy services.

${baseInfo}

Include:
1. Medical Necessity Statement
2. Diagnosis and Clinical Presentation
3. Recommended Treatment Plan
4. Expected Outcomes
5. Supporting Research/Evidence

Use medical billing language appropriate for insurance companies.`;
  }

  return baseInfo;
}
