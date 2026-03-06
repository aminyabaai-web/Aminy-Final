/**
 * Memory System Integration Helpers for Aminy
 * 
 * Provides utility functions to integrate memory system into chat flows:
 * - Extract memories from conversation
 * - Store memories with review
 * - Retrieve relevant memories for context
 * - Mark memories as used
 * - Check if memory is enabled
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;

export interface Memory {
  id: string;
  key: string;
  value: string | object;
  scope: 'child' | 'parent' | 'family';
  confidence: number;
  salience: number;
  why_saved: string;
  created_at: string;
  last_used_at: string | null;
  decay_days: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryExtractionResult {
  memory_items: Array<{
    key: string;
    value: string | object;
    scope: 'child' | 'parent' | 'family';
    confidence: number;
    decay_days: number;
    reinforce_on_repeat: boolean;
    why_saved?: string;
  }>;
  clarifying_question: string | null;
}

/**
 * Extract memory items from conversation text
 */
export async function extractMemories(
  conversationText: string,
  complex: boolean = false
): Promise<MemoryExtractionResult> {
  try {
    const response = await fetch(`${API_BASE}/ai/extract-memory`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rawText: conversationText, complex }),
    });

    if (!response.ok) {
      throw new Error(`Memory extraction failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error extracting memories:', error);
    return { memory_items: [], clarifying_question: null };
  }
}

/**
 * Store a memory item with budget enforcement and salience scoring
 */
export async function storeMemory(
  userId: string,
  memoryItem: MemoryExtractionResult['memory_items'][0],
  skipReview: boolean = false
): Promise<{ success: boolean; memoryId?: string; needsReview?: boolean; skipped?: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/memory/store-with-review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, memoryItem, skipReview }),
    });

    if (!response.ok) {
      throw new Error(`Memory storage failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error storing memory:', error);
    return { success: false };
  }
}

/**
 * Get all memories for a user (for Memory Settings page)
 */
export async function getAllMemories(userId: string): Promise<Memory[]> {
  try {
    const response = await fetch(`${API_BASE}/memory/list/${userId}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch memories: ${response.status}`);
    }

    const data = await response.json();
    return data.memories || [];
  } catch (error) {
    console.error('Error fetching memories:', error);
    return [];
  }
}

/**
 * Get relevant memories for chat context
 * Filters by scope, salience, and semantic relevance (basic keyword match for now)
 */
export async function getRelevantMemories(
  userId: string,
  currentQuery: string,
  maxMemories: number = 10
): Promise<Memory[]> {
  try {
    const allMemories = await getAllMemories(userId);
    
    // Simple relevance scoring (keyword-based)
    const queryLower = currentQuery.toLowerCase();
    const scoredMemories = allMemories.map(memory => {
      let relevanceScore = memory.salience || 0.5;
      
      // Boost if key or value contains query keywords
      const memoryText = `${memory.key} ${JSON.stringify(memory.value)}`.toLowerCase();
      const keywords = queryLower.split(/\s+/).filter(k => k.length > 3);
      const matchCount = keywords.filter(k => memoryText.includes(k)).length;
      relevanceScore += matchCount * 0.1;
      
      // Boost child scope over family over parent
      if (memory.scope === 'child') relevanceScore += 0.15;
      else if (memory.scope === 'family') relevanceScore += 0.05;
      
      return { memory, relevanceScore };
    });
    
    // Sort by relevance and return top-k
    scoredMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return scoredMemories.slice(0, maxMemories).map(s => s.memory);
  } catch (error) {
    console.error('Error getting relevant memories:', error);
    return [];
  }
}

/**
 * Mark memories as used (increases salience, updates last_used_at)
 */
export async function markMemoriesUsed(memoryIds: string[]): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/memory/mark-used`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ memoryIds }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error marking memories as used:', error);
    return false;
  }
}

/**
 * Check if memory saving is enabled for a user
 */
export async function isMemoryEnabled(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/memory/settings/${userId}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return true; // Default to enabled if settings not found
    }

    const data = await response.json();
    return data.settings?.memory_enabled ?? true;
  } catch (error) {
    console.error('Error checking memory settings:', error);
    return true; // Default to enabled on error
  }
}

/**
 * Update memory settings (toggle on/off, update consent, etc.)
 */
export async function updateMemorySettings(
  userId: string,
  settings: { memory_enabled?: boolean; consent_given?: boolean; [key: string]: unknown }
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${API_BASE}/memory/settings/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    return response.ok;
  } catch (error) {
    // Silent fail - don't spam console if server isn't deployed
    if ((error as Error).name !== 'AbortError') {
      console.warn('Memory settings update failed (server may not be deployed yet)');
    }
    return false;
  }
}

/**
 * Delete a specific memory
 */
export async function deleteMemory(userId: string, memoryId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/memory/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, memoryId }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting memory:', error);
    return false;
  }
}

/**
 * Update a specific memory value
 */
export async function updateMemory(
  userId: string,
  memoryId: string,
  newValue: string
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/memory/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, memoryId, value: newValue }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error updating memory:', error);
    return false;
  }
}

/**
 * Build chat context with memories
 * Returns formatted context string for AI prompt
 */
export async function buildChatContextWithMemories(
  userId: string,
  currentQuery: string,
  conversationHistory: Array<{ role: string; content: string }>,
  maxMemories: number = 10
): Promise<string> {
  try {
    // Get relevant memories
    const memories = await getRelevantMemories(userId, currentQuery, maxMemories);
    
    if (memories.length === 0) {
      return ''; // No memory context to add
    }
    
    // Format memories as context
    let contextText = '\n\n--- FAMILY CONTEXT (from Aminy\'s memory) ---\n';
    
    memories.forEach(memory => {
      const valueStr = typeof memory.value === 'string' 
        ? memory.value 
        : JSON.stringify(memory.value);
      
      contextText += `• ${memory.key.replace(/_/g, ' ')}: ${valueStr} [${memory.scope}, confidence: ${memory.confidence.toFixed(1)}]\n`;
    });
    
    contextText += '---\n';
    
    // Mark these memories as used
    await markMemoriesUsed(memories.map(m => m.id));
    
    return contextText;
  } catch (error) {
    console.error('Error building chat context:', error);
    return '';
  }
}

/**
 * Example usage in chat component:
 * 
 * // Before sending message to AI:
 * const memoryContext = await buildChatContextWithMemories(
 *   userId,
 *   userMessage,
 *   conversationHistory
 * );
 * 
 * const aiResponse = await fetch('/ai/chat', {
 *   body: JSON.stringify({
 *     messages: [
 *       { role: 'system', content: systemPrompt + memoryContext },
 *       ...conversationHistory,
 *       { role: 'user', content: userMessage }
 *     ]
 *   })
 * });
 * 
 * // After conversation (periodically):
 * const extracted = await extractMemories(fullConversationText);
 * if (extracted.memory_items.length > 0) {
 *   for (const item of extracted.memory_items) {
 *     const result = await storeMemory(userId, item);
 *     if (result.needsReview) {
 *       // Show MemoryReviewBanner
 *     }
 *   }
 * }
 */