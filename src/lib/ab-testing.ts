const STORAGE_KEY = 'aminy-ab-assignments';

type AssignmentMap = Record<string, string>;

function readAssignments(): AssignmentMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as AssignmentMap : {};
  } catch {
    return {};
  }
}

function writeAssignments(assignments: AssignmentMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  } catch {
    // Ignore storage failures in assignment logic.
  }
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getVariant(
  experimentId: string,
  userId: string,
  variants: string[],
): string {
  if (variants.length === 0) return 'control';
  if (variants.length === 1) return variants[0];

  const assignments = readAssignments();
  const existing = assignments[experimentId];
  if (existing && variants.includes(existing)) {
    return existing;
  }

  const index = hashString(`${experimentId}:${userId}`) % variants.length;
  const variant = variants[index];
  assignments[experimentId] = variant;
  writeAssignments(assignments);
  return variant;
}

export function forceVariant(experimentId: string, variant: string): void {
  const assignments = readAssignments();
  assignments[experimentId] = variant;
  writeAssignments(assignments);
}

export function getAllAssignments(): AssignmentMap {
  return readAssignments();
}

export function clearAssignments(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures in test helpers.
  }
}
