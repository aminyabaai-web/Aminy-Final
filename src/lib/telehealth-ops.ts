import type { CareRail, AppointmentFinancials } from './telehealth-economics';

export type AppointmentLifecycleStatus =
  | 'draft'
  | 'pending_payment_or_verification'
  | 'confirmed'
  | 'ready_to_join'
  | 'in_progress'
  | 'completed'
  | 'settled'
  | 'cancelled'
  | 'refunded'
  | 'failed_verification'
  | 'no_show'
  | 'partner_followup_required';

export type AppointmentPaymentStatus = 'pending' | 'completed' | 'refunded' | 'failed';

export interface LifecycleTransition {
  from: AppointmentLifecycleStatus;
  to: AppointmentLifecycleStatus;
}

export interface AppointmentLifecycleOutcome {
  status: AppointmentLifecycleStatus;
  paymentStatus: AppointmentPaymentStatus;
  settlementStatus: 'pending' | 'ready' | 'settled' | 'blocked';
}

const LEGACY_STATUS_MAP: Record<string, AppointmentLifecycleStatus> = {
  draft: 'draft',
  scheduled: 'confirmed',
  'pending-payment': 'pending_payment_or_verification',
  pending_payment_or_verification: 'pending_payment_or_verification',
  confirmed: 'confirmed',
  'reminder-sent': 'ready_to_join',
  ready_to_join: 'ready_to_join',
  'in-progress': 'in_progress',
  in_progress: 'in_progress',
  completed: 'completed',
  settled: 'settled',
  cancelled: 'cancelled',
  refunded: 'refunded',
  failed_verification: 'failed_verification',
  'failed-verification': 'failed_verification',
  'no-show': 'no_show',
  no_show: 'no_show',
  rescheduled: 'confirmed',
  partner_followup_required: 'partner_followup_required',
};

const ALLOWED_TRANSITIONS: Record<AppointmentLifecycleStatus, AppointmentLifecycleStatus[]> = {
  draft: ['pending_payment_or_verification', 'confirmed', 'cancelled'],
  pending_payment_or_verification: ['confirmed', 'failed_verification', 'cancelled'],
  confirmed: ['ready_to_join', 'in_progress', 'cancelled', 'no_show', 'partner_followup_required'],
  ready_to_join: ['in_progress', 'cancelled', 'no_show', 'partner_followup_required'],
  in_progress: ['completed', 'cancelled', 'partner_followup_required'],
  completed: ['settled', 'partner_followup_required'],
  settled: [],
  cancelled: ['refunded'],
  refunded: [],
  failed_verification: [],
  no_show: ['settled'],
  partner_followup_required: ['confirmed', 'ready_to_join', 'settled', 'cancelled'],
};

export function normalizeAppointmentLifecycleStatus(
  status?: string | null,
): AppointmentLifecycleStatus {
  if (!status) return 'draft';
  return LEGACY_STATUS_MAP[status] || 'draft';
}

export function canTransitionAppointmentStatus(
  from: AppointmentLifecycleStatus,
  to: AppointmentLifecycleStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertValidAppointmentTransition(
  from: AppointmentLifecycleStatus,
  to: AppointmentLifecycleStatus,
): LifecycleTransition {
  if (!canTransitionAppointmentStatus(from, to)) {
    throw new Error(`Invalid appointment transition: ${from} -> ${to}`);
  }

  return { from, to };
}

export function isUpcomingAppointmentStatus(status?: string | null): boolean {
  const normalized = normalizeAppointmentLifecycleStatus(status);
  return ['draft', 'pending_payment_or_verification', 'confirmed', 'ready_to_join', 'partner_followup_required'].includes(normalized);
}

export function isActiveAppointmentStatus(status?: string | null): boolean {
  const normalized = normalizeAppointmentLifecycleStatus(status);
  return ['in_progress', 'confirmed', 'ready_to_join'].includes(normalized);
}

export function isTerminalAppointmentStatus(status?: string | null): boolean {
  const normalized = normalizeAppointmentLifecycleStatus(status);
  return ['settled', 'refunded', 'cancelled', 'failed_verification', 'no_show'].includes(normalized);
}

export function deriveAppointmentLifecycleOutcome(options: {
  rail: CareRail;
  status: string | null | undefined;
  paymentStatus?: AppointmentPaymentStatus | null;
  financials?: AppointmentFinancials | null;
}): AppointmentLifecycleOutcome {
  const status = normalizeAppointmentLifecycleStatus(options.status);
  const paymentStatus = options.paymentStatus || 'pending';

  if (status === 'settled') {
    return { status, paymentStatus, settlementStatus: 'settled' };
  }

  if (status === 'failed_verification') {
    return { status, paymentStatus: 'failed', settlementStatus: 'blocked' };
  }

  if (status === 'refunded') {
    return { status, paymentStatus: 'refunded', settlementStatus: 'settled' };
  }

  if (status === 'cancelled') {
    return {
      status,
      paymentStatus: paymentStatus === 'completed' ? 'refunded' : paymentStatus,
      settlementStatus: paymentStatus === 'completed' ? 'settled' : 'blocked',
    };
  }

  if (status === 'completed' || status === 'no_show') {
    const requiresSettlement = Boolean(options.financials && (options.financials.providerPayoutCents > 0 || options.financials.partnerVisitFeeCents));
    return {
      status,
      paymentStatus: paymentStatus === 'pending' && options.rail === 'cash_pay_direct' ? 'completed' : paymentStatus,
      settlementStatus: requiresSettlement ? 'ready' : 'pending',
    };
  }

  return { status, paymentStatus, settlementStatus: 'pending' };
}

export function getRoomReadyStatus(status?: string | null): AppointmentLifecycleStatus {
  const normalized = normalizeAppointmentLifecycleStatus(status);
  if (normalized === 'confirmed') return 'ready_to_join';
  return normalized;
}

export function getStatusLabel(status?: string | null): string {
  const normalized = normalizeAppointmentLifecycleStatus(status);

  switch (normalized) {
    case 'pending_payment_or_verification':
      return 'Pending Payment or Verification';
    case 'ready_to_join':
      return 'Ready to Join';
    case 'in_progress':
      return 'In Progress';
    case 'failed_verification':
      return 'Verification Failed';
    case 'no_show':
      return 'No Show';
    case 'partner_followup_required':
      return 'Partner Follow-up Required';
    default:
      return normalized.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
