/**
 * Simple A/B Testing Utility
 *
 * Provides deterministic variant assignment based on userId,
 * localStorage persistence, and analytics integration.
 *
 * Usage:
 *   const variant = getVariant('paywall-cta', userId, ['control', 'urgency', 'social-proof']);
 *   // variant is consistently 'control', 'urgency', or 'social-proof' for that userId
 */

const STORAGE_KEY = 'aminy-ab-assignments';

interface ExperimentAssignment {
  variant: string;
  assignedAt: number;
}

/**
 * Simple hash function for deterministic variant assignment.
 * Uses the same variant for the same userId + experiment combo.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get all persisted experiment assignments
 */
function getAssignments(): Record<string, ExperimentAssignment> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Persist an experiment assignment
 */
function saveAssignment(experimentId: string, assignment: ExperimentAssignment): void {
  try {
    const assignments = getAssignments();
    assignments[experimentId] = assignment;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  } catch {
    // Non-critical — experiment still works without persistence
  }
}

/**
 * Get the variant for a user in an experiment.
 * Deterministic: same userId + experimentId always returns the same variant.
 * Persisted in localStorage for consistency across sessions.
 *
 * @param experimentId - Unique experiment name (e.g., 'paywall-cta-v2')
 * @param userId - The user's ID (or anonymous ID)
 * @param variants - Array of variant names (first is typically 'control')
 * @returns The assigned variant name
 */
export function getVariant(
  experimentId: string,
  userId: string,
  variants: string[]
): string {
  if (variants.length === 0) return 'control';
  if (variants.length === 1) return variants[0];

  // Check for existing assignment
  const assignments = getAssignments();
  const existing = assignments[experimentId];
  if (existing && variants.includes(existing.variant)) {
    return existing.variant;
  }

  // Deterministic assignment based on userId + experimentId
  const hash = hashString(`${userId}:${experimentId}`);
  const variantIndex = hash % variants.length;
  const variant = variants[variantIndex];

  // Persist
  saveAssignment(experimentId, { variant, assignedAt: Date.now() });

  return variant;
}

/**
 * Force-assign a variant (for admin/testing purposes)
 */
export function forceVariant(experimentId: string, variant: string): void {
  saveAssignment(experimentId, { variant, assignedAt: Date.now() });
}

/**
 * Get all active experiment assignments for analytics export
 */
export function getAllAssignments(): Record<string, string> {
  const assignments = getAssignments();
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(assignments)) {
    result[key] = value.variant;
  }
  return result;
}

/**
 * Clear all experiment assignments (useful for testing)
 */
export function clearAssignments(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-critical
  }
}
