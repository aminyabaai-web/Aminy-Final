import type { VaultRecord } from '../types/vault';
import { VAULT_EVENTS } from '../types/vault';
import { connectorHub } from './connector-hub';

// Auto-file Benefits artifacts to vault
export const autoFileBenefitsLetter = (childId: string, state: string): VaultRecord => {
  const record: VaultRecord = {
    id: `vault-benefits-${Date.now()}`,
    childId,
    title: `Evaluation Request Letter - ${state}`,
    category: ['Letters & forms'],
    tags: ['Benefits', 'School', 'Evaluation'],
    date: new Date().toISOString().split('T')[0],
    vaultText: `Evaluation Request Letter

Dear ${state} Department of Education,

I am writing to request a comprehensive developmental evaluation for my child under the provisions of IDEA and Section 504. Based on observations and developmental concerns, I believe my child may benefit from special education services or accommodations.

Requested Evaluations:
- Comprehensive psychological evaluation
- Speech and language assessment
- Occupational therapy evaluation
- Educational assessment
- Behavioral assessment

I request that this evaluation be completed within the legally mandated timeframes and that I be provided with copies of all evaluation reports.

Thank you for your attention to this matter.

Sincerely,
[Parent Name]`,
    quickSummary: `• Formal request for comprehensive evaluation under IDEA/504
• Multiple assessment areas specified
• Legal timeframes referenced
• Copy of reports requested`,
    keyFields: {
      document_type: 'Evaluation Request Letter',
      state: state,
      legal_basis: 'IDEA, Section 504',
      evaluations_requested: '5 assessment areas',
      date_created: new Date().toLocaleDateString()
    },
    usableByAssistant: false, // Off by default as requested
    attachToExport: true, // ON by default for letters
    createdAt: new Date().toISOString(),
    sourceType: 'auto-generated',
    fileType: 'text/plain'
  };

  // Publish vault events
  connectorHub.publish(VAULT_EVENTS.VAULT_RECORD_ADDED, {
    recordId: record.id,
    childId: record.childId,
    title: record.title,
    category: record.category,
    usableByAssistant: record.usableByAssistant
  }, 'benefits-coach');

  return record;
};

// Auto-file Benefits status snapshot
export const autoFileBenefitsSnapshot = (childId: string, state: string, statusCounts: {covered: number, unsure: number, not_covered: number}): VaultRecord => {
  const record: VaultRecord = {
    id: `vault-benefits-snapshot-${Date.now()}`,
    childId,
    title: `Benefits Status - ${state}`,
    category: ['Benefits', 'Other'],
    tags: ['Benefits', 'Status', 'Snapshot'],
    date: new Date().toISOString().split('T')[0],
    vaultText: `Benefits Status Snapshot - ${state}

Generated: ${new Date().toLocaleDateString()}

Coverage Summary:
• Covered Services: ${statusCounts.covered} items
• Uncertain Coverage: ${statusCounts.unsure} items  
• Not Covered: ${statusCounts.not_covered} items

This snapshot reflects the current understanding of benefit coverage based on available information. Coverage may change based on additional documentation, pre-authorization requirements, or policy updates.

Recommendations:
- Review uncertain items with insurance provider
- Gather additional documentation for not covered items
- Consider appeal process for denied services if appropriate

Note: This information is for planning purposes only and does not constitute a guarantee of coverage.`,
    quickSummary: `• ${statusCounts.covered} services covered, ${statusCounts.unsure} uncertain, ${statusCounts.not_covered} not covered
• Snapshot created for planning purposes
• Recommendations provided for next steps
• Coverage subject to verification with provider`,
    keyFields: {
      document_type: 'Benefits Status Snapshot',
      state: state,
      covered_count: statusCounts.covered.toString(),
      unsure_count: statusCounts.unsure.toString(),
      not_covered_count: statusCounts.not_covered.toString(),
      date_created: new Date().toLocaleDateString()
    },
    usableByAssistant: false, // Off by default
    attachToExport: false, // Off by default for snapshots
    createdAt: new Date().toISOString(),
    sourceType: 'auto-generated',
    fileType: 'text/plain'
  };

  // Publish vault events
  connectorHub.publish(VAULT_EVENTS.VAULT_RECORD_ADDED, {
    recordId: record.id,
    childId: record.childId,
    title: record.title,
    category: record.category,
    usableByAssistant: record.usableByAssistant
  }, 'benefits-coach');

  return record;
};

// Auto-file Insight Snapshot to vault
export const autoFileInsightSnapshot = (childId: string, insightData: any): VaultRecord => {
  const record: VaultRecord = {
    id: `vault-insight-${Date.now()}`,
    childId,
    title: `Insight Snapshot - ${new Date().toLocaleDateString()}`,
    category: ['Evaluations'],
    tags: ['Insight', 'Assessment', 'AI-Generated'],
    date: new Date().toISOString().split('T')[0],
    vaultText: `Aminy Insight Snapshot

Generated: ${new Date().toLocaleString()}
Confidence Level: ${insightData.confidence || 85}%

Key Observations:
${insightData.flags?.map((flag: string) => `• ${flag}`).join('\n') || '• Comprehensive assessment completed'}

Developmental Areas Assessed:
• Communication and language skills
• Social interaction patterns  
• Behavioral regulation
• Sensory processing
• Adaptive functioning

Recommendations:
${insightData.recommendations?.map((rec: string) => `• ${rec}`).join('\n') || '• Continue current interventions\n• Monitor progress regularly\n• Consider additional assessments as needed'}

Next Steps:
• Share findings with care team
• Implement recommended strategies
• Schedule follow-up assessment in 3-6 months
• Track progress using baseline metrics

Generated by Aminy AI - This assessment is for informational purposes and should be reviewed with qualified professionals.`,
    quickSummary: `• AI-powered developmental assessment completed
• ${insightData.confidence || 85}% confidence level
• Key areas evaluated and recommendations provided
• Generated for care planning and team coordination`,
    keyFields: {
      document_type: 'Insight Snapshot',
      confidence_level: `${insightData.confidence || 85}%`,
      flags_count: insightData.flags?.length?.toString() || '0',
      recommendations_count: insightData.recommendations?.length?.toString() || '0',
      date_created: new Date().toLocaleDateString(),
      ai_generated: 'true'
    },
    usableByAssistant: true, // ON by default for Insight snapshots only
    attachToExport: false, // Off by default
    createdAt: new Date().toISOString(),
    sourceType: 'auto-generated',
    fileType: 'text/plain'
  };

  // Publish vault events
  connectorHub.publish(VAULT_EVENTS.VAULT_RECORD_ADDED, {
    recordId: record.id,
    childId: record.childId,
    title: record.title,
    category: record.category,
    usableByAssistant: record.usableByAssistant
  }, 'insight-navigator');

  // Since usable by assistant is ON, also publish indexing event
  connectorHub.publish(VAULT_EVENTS.VAULT_RECORD_INDEXED, {
    recordId: record.id,
    title: record.title,
    category: record.category,
    tags: record.tags,
    textPreview: record.vaultText?.substring(0, 200) || ''
  }, 'insight-navigator');

  return record;
};

// Search vault records for Talk to Aminy
export const searchVaultRecords = (
  records: VaultRecord[], 
  query: string, 
  useRecords: boolean
): Array<{record: VaultRecord, relevanceScore: number, matchedText?: string}> => {
  if (!useRecords || !query.trim()) return [];
  
  const usableRecords = records.filter(record => record.usableByAssistant);
  
  return usableRecords
    .map(record => {
      let score = 0;
      let matchedText = '';
      
      const searchableText = {
        title: record.title.toLowerCase(),
        content: record.vaultText?.toLowerCase() || '',
        tags: record.tags.join(' ').toLowerCase(),
        summary: record.quickSummary?.toLowerCase() || ''
      };
      
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(' ').filter(word => word.length > 2);
      
      // Title matching (highest weight)
      if (searchableText.title.includes(queryLower)) {
        score += 20;
        matchedText = record.title;
      }
      
      // Content matching
      queryWords.forEach(word => {
        if (searchableText.content.includes(word)) {
          score += 5;
          if (!matchedText && record.vaultText) {
            // Find context around the match
            const index = searchableText.content.indexOf(word);
            const start = Math.max(0, index - 50);
            const end = Math.min(record.vaultText.length, index + 100);
            matchedText = record.vaultText.substring(start, end) + '...';
          }
        }
        
        if (searchableText.tags.includes(word)) score += 8;
        if (searchableText.summary.includes(word)) score += 6;
      });
      
      // Category relevance
      const queryTerms = ['iep', '504', 'evaluation', 'therapy', 'school', 'medical', 'insurance'];
      queryTerms.forEach(term => {
        if (queryLower.includes(term)) {
          record.category.forEach(cat => {
            if (cat.toLowerCase().includes(term)) score += 10;
          });
        }
      });
      
      return { 
        record, 
        relevanceScore: score,
        matchedText: matchedText || record.quickSummary?.substring(0, 100) + '...' || ''
      };
    })
    .filter(result => result.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3); // Top 3 most relevant results
};