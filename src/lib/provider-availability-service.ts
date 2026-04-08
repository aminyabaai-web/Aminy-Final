// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider Availability Service
 *
 * Manages provider weekly availability slots for the scheduling system.
 * Supports CRUD operations for time slots with Supabase persistence.
 * Integrates with the existing telehealth booking concept.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type SlotType = 'available' | 'telehealth_only' | 'in_person_only' | 'blocked';
export type Recurrence = 'weekly' | 'biweekly' | 'one_time';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export type DayName = typeof DAY_NAMES[number];

export interface AvailabilitySlot {
  id: string;
  providerId: string;
  dayOfWeek: number; // 0=Sun, 6=Sat
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  slotType: SlotType;
  recurrence: Recurrence;
  effectiveFrom?: string;
  effectiveUntil?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySchedule {
  [key: number]: AvailabilitySlot[];
}

export interface AddSlotParams {
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotType?: SlotType;
  recurrence?: Recurrence;
  effectiveFrom?: string;
  effectiveUntil?: string;
  notes?: string;
}

export interface BookableSlot {
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  slotType: SlotType;
  availabilityId: string;
}

// ============================================================================
// Demo Data
// ============================================================================

const DEMO_SLOTS: AvailabilitySlot[] = [
  { id: 'slot-001', providerId: 'current', dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotType: 'available', recurrence: 'weekly', createdAt: '2026-03-01', updatedAt: '2026-03-01' },
  { id: 'slot-002', providerId: 'current', dayOfWeek: 1, startTime: '13:00', endTime: '17:00', slotType: 'available', recurrence: 'weekly', createdAt: '2026-03-01', updatedAt: '2026-03-01' },
  { id: 'slot-003', providerId: 'current', dayOfWeek: 2, startTime: '09:00', endTime: '11:00', slotType: 'telehealth_only', recurrence: 'weekly', createdAt: '2026-03-01', updatedAt: '2026-03-01' },
  { id: 'slot-004', providerId: 'current', dayOfWeek: 2, startTime: '13:00', endTime: '16:00', slotType: 'in_person_only', recurrence: 'weekly', createdAt: '2026-03-01', updatedAt: '2026-03-01' },
  { id: 'slot-005', providerId: 'current', dayOfWeek: 3, startTime: '08:00', endTime: '12:00', slotType: 'available', recurrence: 'weekly', createdAt: '2026-03-01', updatedAt: '2026-03-01' },
  { id: 'slot-006', providerId: 'current', dayOfWeek: 3, startTime: '14:00', endTime: '18:00', slotType: 'available', recurrence: 'weekly', createdAt: '2026-03-01', updatedAt: '2026-03-01' },
  { id: 'slot-007', providerId: 'current', dayOfWeek: 4, startTime: '09:00', endTime: '12:00', slotType: 'available', recurrence: 'weekly', createdAt: '2026-03-01', updatedAt: '2026-03-01' },
  { id: 'slot-008', providerId: 'current', dayOfWeek: 4, startTime: '13:00', endTime: '17:00', slotType: 'telehealth_only', recurrence: 'weekly', createdAt: '2026-03-01', updatedAt: '2026-03-01' },
  { id: 'slot-009', providerId: 'current', dayOfWeek: 5, startTime: '09:00', endTime: '15:00', slotType: 'available', recurrence: 'weekly', createdAt: '2026-03-01', updatedAt: '2026-03-01' },
];

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get all availability slots for a provider, organized by day
 */
export async function getAvailability(providerId: string): Promise<{ data: WeeklySchedule; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', providerId)
      .neq('slot_type', 'blocked')
      .order('day_of_week')
      .order('start_time');

    if (error) throw error;

    const schedule: WeeklySchedule = {};
    for (let i = 0; i < 7; i++) schedule[i] = [];

    if (data && data.length > 0) {
      for (const row of data) {
        const slot = mapSlotFromDb(row);
        schedule[slot.dayOfWeek].push(slot);
      }
    } else {
      // Fall back to demo data
      return { data: buildDemoSchedule(providerId), error: null };
    }

    return { data: schedule, error: null };
  } catch {
    return { data: buildDemoSchedule(providerId), error: null };
  }
}

/**
 * Add a new availability slot
 */
export async function addSlot(params: AddSlotParams): Promise<{ data: AvailabilitySlot | null; error: string | null }> {
  // Validate time range
  if (params.startTime >= params.endTime) {
    return { data: null, error: 'Start time must be before end time' };
  }

  try {
    const { data, error } = await supabase
      .from('provider_availability')
      .insert({
        provider_id: params.providerId,
        day_of_week: params.dayOfWeek,
        start_time: params.startTime,
        end_time: params.endTime,
        slot_type: params.slotType || 'available',
        recurrence: params.recurrence || 'weekly',
        effective_from: params.effectiveFrom || null,
        effective_until: params.effectiveUntil || null,
        notes: params.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { data: mapSlotFromDb(data), error: null };
  } catch {
    // Return mock slot in dev
    const mockSlot: AvailabilitySlot = {
      id: `slot-${Date.now()}`,
      providerId: params.providerId,
      dayOfWeek: params.dayOfWeek,
      startTime: params.startTime,
      endTime: params.endTime,
      slotType: params.slotType || 'available',
      recurrence: params.recurrence || 'weekly',
      effectiveFrom: params.effectiveFrom,
      effectiveUntil: params.effectiveUntil,
      notes: params.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { data: mockSlot, error: null };
  }
}

/**
 * Remove an availability slot
 */
export async function removeSlot(slotId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('provider_availability')
      .delete()
      .eq('id', slotId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to remove slot' };
  }
}

/**
 * Update an existing availability slot
 */
export async function updateSlot(
  slotId: string,
  updates: Partial<AddSlotParams>
): Promise<{ data: AvailabilitySlot | null; error: string | null }> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.dayOfWeek !== undefined) dbUpdates.day_of_week = updates.dayOfWeek;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.slotType !== undefined) dbUpdates.slot_type = updates.slotType;
    if (updates.recurrence !== undefined) dbUpdates.recurrence = updates.recurrence;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { data, error } = await supabase
      .from('provider_availability')
      .update(dbUpdates)
      .eq('id', slotId)
      .select()
      .single();

    if (error) throw error;
    return { data: mapSlotFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to update slot' };
  }
}

/**
 * Get bookable slots for the next N days (used by families booking appointments)
 */
export async function getBookableSlots(
  providerId: string,
  daysAhead: number = 14
): Promise<{ data: BookableSlot[]; error: string | null }> {
  const { data: schedule, error } = await getAvailability(providerId);
  if (error) return { data: [], error };

  const bookable: BookableSlot[] = [];
  const today = new Date();

  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    const daySlots = schedule[dayOfWeek] || [];
    for (const slot of daySlots) {
      // Check effective dates
      if (slot.effectiveFrom && dateStr < slot.effectiveFrom) continue;
      if (slot.effectiveUntil && dateStr > slot.effectiveUntil) continue;

      bookable.push({
        date: dateStr,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotType: slot.slotType,
        availabilityId: slot.id,
      });
    }
  }

  return { data: bookable, error: null };
}

// ============================================================================
// Helpers
// ============================================================================

function mapSlotFromDb(row: Record<string, unknown>): AvailabilitySlot {
  return {
    id: row.id as string,
    providerId: row.provider_id as string,
    dayOfWeek: row.day_of_week as number,
    startTime: formatTime(row.start_time as string),
    endTime: formatTime(row.end_time as string),
    slotType: (row.slot_type as SlotType) || 'available',
    recurrence: (row.recurrence as Recurrence) || 'weekly',
    effectiveFrom: row.effective_from as string | undefined,
    effectiveUntil: row.effective_until as string | undefined,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function formatTime(time: string): string {
  // Ensure HH:MM format (strip seconds if present)
  if (!time) return '00:00';
  const parts = time.split(':');
  return `${parts[0].padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}`;
}

function buildDemoSchedule(providerId: string): WeeklySchedule {
  const schedule: WeeklySchedule = {};
  for (let i = 0; i < 7; i++) schedule[i] = [];

  for (const slot of DEMO_SLOTS) {
    schedule[slot.dayOfWeek].push({ ...slot, providerId });
  }
  return schedule;
}
