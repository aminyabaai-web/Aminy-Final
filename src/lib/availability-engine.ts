/**
 * Availability Engine
 * Generates bookable time slots from provider availability blocks
 *
 * Features:
 * - Slot generation for next 14 days
 * - Time-off block exclusion
 * - Double-booking prevention (slot holds)
 * - Timezone handling
 */

import {
  AvailabilityBlock,
  TimeOffBlock,
  TimeSlot,
  VisitType,
  VISIT_TYPES,
  DayOfWeek
} from '../types/telehealth';

// Configuration
const SLOT_GENERATION_DAYS = 14;
const SLOT_HOLD_DURATION_MINUTES = 10;

// ============================================================================
// Slot Generation
// ============================================================================

/**
 * Generate all available time slots for a provider
 */
export function generateSlots(
  providerId: string,
  availabilityBlocks: AvailabilityBlock[],
  timeOffBlocks: TimeOffBlock[],
  visitType: VisitType,
  existingAppointments: { startTime: string; endTime: string }[] = [],
  startDate: Date = new Date()
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const visitConfig = VISIT_TYPES[visitType];
  const slotDuration = visitConfig.duration;
  const bufferTime = visitConfig.bufferTime;
  const totalSlotTime = slotDuration + bufferTime;

  // Generate for next N days
  for (let dayOffset = 0; dayOffset < SLOT_GENERATION_DAYS; dayOffset++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + dayOffset);
    currentDate.setHours(0, 0, 0, 0);

    const dayOfWeek = currentDate.getDay() as DayOfWeek;

    // Find availability blocks for this day
    const dayBlocks = availabilityBlocks.filter(block => block.dayOfWeek === dayOfWeek);

    for (const block of dayBlocks) {
      // Check if block is effective for this date
      if (block.effectiveFrom && new Date(block.effectiveFrom) > currentDate) continue;
      if (block.effectiveUntil && new Date(block.effectiveUntil) < currentDate) continue;

      // Generate slots within this block
      const blockSlots = generateSlotsForBlock(
        providerId,
        currentDate,
        block,
        totalSlotTime,
        visitType,
        timeOffBlocks,
        existingAppointments
      );

      slots.push(...blockSlots);
    }
  }

  // Sort by start time
  return slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

/**
 * Generate slots within a single availability block
 */
function generateSlotsForBlock(
  providerId: string,
  date: Date,
  block: AvailabilityBlock,
  totalSlotTime: number,
  visitType: VisitType,
  timeOffBlocks: TimeOffBlock[],
  existingAppointments: { startTime: string; endTime: string }[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Parse block times
  const [startHour, startMinute] = block.startTime.split(':').map(Number);
  const [endHour, endMinute] = block.endTime.split(':').map(Number);

  // Create start and end timestamps
  const blockStart = new Date(date);
  blockStart.setHours(startHour, startMinute, 0, 0);

  const blockEnd = new Date(date);
  blockEnd.setHours(endHour, endMinute, 0, 0);

  // Generate slots
  let slotStart = new Date(blockStart);

  while (slotStart.getTime() + totalSlotTime * 60000 <= blockEnd.getTime()) {
    const slotEnd = new Date(slotStart.getTime() + totalSlotTime * 60000);

    // Check if slot overlaps with time off
    const isTimeOff = timeOffBlocks.some(timeOff =>
      isOverlapping(
        slotStart,
        slotEnd,
        new Date(timeOff.startDateTime),
        new Date(timeOff.endDateTime)
      )
    );

    // Check if slot overlaps with existing appointments
    const isBooked = existingAppointments.some(apt =>
      isOverlapping(
        slotStart,
        slotEnd,
        new Date(apt.startTime),
        new Date(apt.endTime)
      )
    );

    // Check if slot is in the past
    const isPast = slotStart.getTime() < Date.now();

    // Only add available slots
    if (!isTimeOff && !isBooked && !isPast) {
      slots.push({
        id: `slot-${providerId}-${slotStart.toISOString()}`,
        providerId,
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        visitType,
        status: 'available'
      });
    }

    // Move to next slot
    slotStart = new Date(slotStart.getTime() + totalSlotTime * 60000);
  }

  return slots;
}

/**
 * Check if two time ranges overlap
 */
function isOverlapping(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2;
}

// ============================================================================
// Slot Holding (Prevents Double Booking)
// ============================================================================

// In-memory store for slot holds (in production, use Redis or similar)
const slotHolds = new Map<string, { userId: string; expiresAt: Date }>();

/**
 * Attempt to hold a slot for a user during checkout
 */
export function holdSlot(slotId: string, userId: string): boolean {
  // Check if slot is already held by someone else
  const existingHold = slotHolds.get(slotId);

  if (existingHold) {
    // Check if hold has expired
    if (existingHold.expiresAt > new Date()) {
      // Still held by someone else
      if (existingHold.userId !== userId) {
        return false;
      }
      // Same user - extend hold
    }
  }

  // Create or update hold
  const expiresAt = new Date(Date.now() + SLOT_HOLD_DURATION_MINUTES * 60000);
  slotHolds.set(slotId, { userId, expiresAt });

  return true;
}

/**
 * Release a slot hold
 */
export function releaseHold(slotId: string, userId: string): void {
  const hold = slotHolds.get(slotId);
  if (hold && hold.userId === userId) {
    slotHolds.delete(slotId);
  }
}

/**
 * Convert a held slot to a booked appointment
 */
export function confirmSlot(slotId: string, userId: string, appointmentId: string): boolean {
  const hold = slotHolds.get(slotId);

  if (!hold) {
    return false;
  }

  if (hold.userId !== userId) {
    return false;
  }

  if (hold.expiresAt < new Date()) {
    slotHolds.delete(slotId);
    return false;
  }

  // Success - remove hold (appointment now takes its place)
  slotHolds.delete(slotId);
  return true;
}

/**
 * Clean up expired holds
 */
export function cleanupExpiredHolds(): void {
  const now = new Date();
  for (const [slotId, hold] of slotHolds) {
    if (hold.expiresAt < now) {
      slotHolds.delete(slotId);
    }
  }
}

// Run cleanup every minute
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredHolds, 60000);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get available slots for a specific date
 */
export function getSlotsForDate(
  slots: TimeSlot[],
  date: Date
): TimeSlot[] {
  const dateStr = date.toISOString().split('T')[0];
  return slots.filter(slot => slot.startTime.startsWith(dateStr));
}

/**
 * Group slots by provider
 */
export function groupSlotsByProvider(
  slots: TimeSlot[]
): Record<string, TimeSlot[]> {
  return slots.reduce((acc, slot) => {
    if (!acc[slot.providerId]) {
      acc[slot.providerId] = [];
    }
    acc[slot.providerId].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);
}

/**
 * Format time slot for display
 */
export function formatSlotTime(isoString: string, timezone?: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone
  });
}

/**
 * Format slot date for display
 */
export function formatSlotDate(isoString: string, timezone?: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone
  });
}

/**
 * Check if a slot is within the next N hours (for "join now" button)
 */
export function isSlotSoon(isoString: string, hoursThreshold: number = 0.25): boolean {
  const slotTime = new Date(isoString).getTime();
  const now = Date.now();
  const thresholdMs = hoursThreshold * 60 * 60 * 1000;
  return slotTime - now <= thresholdMs && slotTime > now;
}

/**
 * Get the next available slot for a provider
 */
export function getNextAvailableSlot(
  slots: TimeSlot[],
  providerId: string
): TimeSlot | undefined {
  return slots
    .filter(s => s.providerId === providerId && s.status === 'available')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
}

// ============================================================================
// 72-Hour Telehealth-First Routing Rule
// ============================================================================

export interface TelehealthAvailabilityCheck {
  hasAvailabilityWithin72Hours: boolean;
  eligibleProviderCount: number;
  earliestSlot: TimeSlot | null;
  shouldShowLocalCare: boolean;
  fallbackOptions: {
    showWaitlist: boolean;
    showLocalCareSupport: boolean;
    showHomeProgramCTA: boolean;
  };
}

/**
 * Check if there are eligible telehealth providers with availability within 72 hours
 *
 * Business Rule (AUTHORITATIVE):
 * - "Help finding local care" ONLY appears when there are ZERO eligible Aminy telehealth
 *   providers licensed in the user's state with availability within the next 72 hours.
 * - When telehealth is available within 72 hours, do NOT display any local care options.
 *
 * "Eligible telehealth provider within 72 hours" means:
 * - Provider licensed in the user's selected state
 * - Provider has at least one bookable remote slot in the next 72 hours (user timezone)
 * - Slot is not blocked by time off, existing booking, or visit-type mismatch
 */
export function checkTelehealthAvailability72Hours(
  providers: { id: string; licensedStates: string[]; isActive: boolean; acceptingNewPatients: boolean }[],
  userState: string,
  allSlots: TimeSlot[],
  visitType?: VisitType
): TelehealthAvailabilityCheck {
  const now = new Date();
  const seventyTwoHoursFromNow = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  // Filter to eligible providers (licensed in user's state, active, accepting)
  const eligibleProviders = providers.filter(provider =>
    provider.licensedStates.includes(userState) &&
    provider.isActive &&
    provider.acceptingNewPatients
  );

  // Filter slots to next 72 hours and eligible providers
  const slotsWithin72Hours = allSlots.filter(slot => {
    const slotTime = new Date(slot.startTime);
    const isWithin72Hours = slotTime >= now && slotTime <= seventyTwoHoursFromNow;
    const isAvailable = slot.status === 'available';
    const isEligibleProvider = eligibleProviders.some(p => p.id === slot.providerId);
    const matchesVisitType = !visitType || slot.visitType === visitType;

    return isWithin72Hours && isAvailable && isEligibleProvider && matchesVisitType;
  });

  // Sort to find earliest slot
  const sortedSlots = slotsWithin72Hours.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const hasAvailability = sortedSlots.length > 0;
  const eligibleProviderCount = new Set(sortedSlots.map(s => s.providerId)).size;

  return {
    hasAvailabilityWithin72Hours: hasAvailability,
    eligibleProviderCount,
    earliestSlot: sortedSlots[0] || null,
    shouldShowLocalCare: !hasAvailability,
    fallbackOptions: {
      showWaitlist: !hasAvailability,
      showLocalCareSupport: !hasAvailability,
      showHomeProgramCTA: !hasAvailability
    }
  };
}

/**
 * Format the 72-hour availability status for UI display
 */
export function formatAvailabilityStatus(check: TelehealthAvailabilityCheck): {
  title: string;
  subtitle: string;
  ctaText: string;
} {
  if (check.hasAvailabilityWithin72Hours && check.earliestSlot) {
    const slotDate = new Date(check.earliestSlot.startTime);
    const isToday = slotDate.toDateString() === new Date().toDateString();
    const isTomorrow = slotDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

    let timeDesc = slotDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (isToday) timeDesc = 'Today';
    if (isTomorrow) timeDesc = 'Tomorrow';

    return {
      title: `${check.eligibleProviderCount} provider${check.eligibleProviderCount > 1 ? 's' : ''} available`,
      subtitle: `Next appointment: ${timeDesc} at ${slotDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      ctaText: 'Book Now'
    };
  }

  return {
    title: 'No telehealth available in your state within 72 hours',
    subtitle: 'We\'ll support you at home while you wait',
    ctaText: 'See Options'
  };
}
