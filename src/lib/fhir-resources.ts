/**
 * FHIR Resources - Stub
 * Original file was removed. This provides no-op exports to prevent build errors.
 */

export interface FHIREncounter {
  resourceType: 'Encounter';
  id: string;
  status: string;
  class: { code: string };
  subject: { reference: string };
  period: { start: string; end?: string };
}

export interface FHIRBundle {
  resourceType: 'Bundle';
  type: string;
  entry: Array<{ resource: unknown }>;
}

export function toFHIREncounter(
  _appointment: unknown,
  _childId: string
): FHIREncounter {
  console.warn('[fhir-resources] toFHIREncounter is a no-op stub');
  return {
    resourceType: 'Encounter',
    id: 'stub',
    status: 'planned',
    class: { code: 'AMB' },
    subject: { reference: `Patient/${_childId}` },
    period: { start: new Date().toISOString() },
  };
}

export function toFHIRBundle(
  _resources: unknown[],
  _meta?: Record<string, unknown>
): FHIRBundle {
  console.warn('[fhir-resources] toFHIRBundle is a no-op stub');
  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [],
  };
}
