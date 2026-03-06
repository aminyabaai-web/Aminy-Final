/**
 * patient-invoicing.ts
 *
 * Generates and manages patient responsibility invoices from ERA 835
 * remittance data. After insurance processes a claim, any remaining
 * patient responsibility (copays, coinsurance, deductibles) is
 * converted into a patient-facing invoice.
 *
 * Features:
 * 1. Extract patient responsibility from ERA 835 PR adjustment group
 * 2. Generate itemized patient invoices with copay/coinsurance/deductible breakdown
 * 3. Payment plan creation and management
 * 4. Invoice status tracking through lifecycle
 * 5. Aging bucket reporting (30/60/90/120+ days)
 * 6. Supabase persistence and Stripe payment link generation
 */

import { type ERA835ClaimAdjudication, type ERA835ParseResult } from './clearinghouse-integration';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// Types
// ============================================================================

/** Invoice status through its lifecycle */
export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partial-payment'
  | 'paid'
  | 'overdue'
  | 'in-collections'
  | 'written-off'
  | 'disputed';

/** Payment method types */
export type PaymentMethod = 'stripe' | 'cash' | 'check' | 'hsa' | 'fsa' | 'other';

/** Breakdown of patient responsibility by type */
export interface PatientResponsibilityBreakdown {
  copay: number;
  coinsurance: number;
  deductible: number;
  otherAdjustments: number;
  totalResponsibility: number;
}

/** Individual line item on a patient invoice */
export interface PatientInvoiceLineItem {
  procedureCode: string;
  description: string;
  dateOfService: string;
  totalCharged: number;
  insurancePaid: number;
  copay: number;
  coinsurance: number;
  deductible: number;
  otherAdjustment: number;
  patientOwes: number;
}

/** Full patient invoice record */
export interface PatientInvoice {
  id: string;
  invoiceNumber: string;
  // Patient info
  patientId: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  patientAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
  // Provider info
  providerId: string;
  providerName: string;
  providerNpi?: string;
  // Payer info
  payerName: string;
  payerId: string;
  // Claim reference
  claimControlNumber: string;
  eraCheckNumber?: string;
  // Line items
  lineItems: PatientInvoiceLineItem[];
  // Responsibility breakdown
  responsibilityBreakdown: PatientResponsibilityBreakdown;
  // Financial
  subtotal: number;
  previousBalance: number;
  adjustments: number;
  totalDue: number;
  amountPaid: number;
  balance: number;
  // Payment plan
  paymentPlan?: PaymentPlan;
  // Payment
  stripePaymentLinkId?: string;
  stripePaymentLinkUrl?: string;
  // Dates
  dateOfService: string;
  invoiceDate: string;
  dueDate: string;
  lastPaymentDate?: string;
  // Status
  status: InvoiceStatus;
  // Aging
  agingBucket: '0-30' | '31-60' | '61-90' | '91-120' | '120+';
  // Notes
  notes?: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/** Payment plan configuration */
export interface PaymentPlan {
  id: string;
  invoiceId: string;
  totalAmount: number;
  numberOfInstallments: number;
  installmentAmount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
  installments: PaymentPlanInstallment[];
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
}

/** Individual installment in a payment plan */
export interface PaymentPlanInstallment {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidDate?: string;
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
}

/** Payment record for tracking individual payments */
export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  paidDate: string;
  notes?: string;
}

/** Aging report summary */
export interface AgingReport {
  providerId: string;
  asOfDate: string;
  totalOutstanding: number;
  buckets: {
    current: { count: number; amount: number };     // 0-30 days
    thirtyDay: { count: number; amount: number };    // 31-60 days
    sixtyDay: { count: number; amount: number };     // 61-90 days
    ninetyDay: { count: number; amount: number };    // 91-120 days
    overOneTwenty: { count: number; amount: number }; // 120+ days
  };
  byPayer: Array<{
    payerId: string;
    payerName: string;
    outstanding: number;
    invoiceCount: number;
  }>;
}

// ============================================================================
// Constants
// ============================================================================

/** Default payment terms in days */
const DEFAULT_PAYMENT_TERMS_DAYS = 30;

/** CARC codes that map to patient responsibility types */
const PR_COPAY_CODES = ['3'];        // Copay
const PR_COINSURANCE_CODES = ['2'];   // Coinsurance
const PR_DEDUCTIBLE_CODES = ['1'];    // Deductible

// ============================================================================
// Invoice Number Generation
// ============================================================================

function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const seq = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${year}${month}-${seq}`;
}

// ============================================================================
// Core: Extract Patient Responsibility from ERA 835
// ============================================================================

/**
 * Extracts patient responsibility breakdown from ERA 835 claim data.
 * Parses the PR (Patient Responsibility) adjustment group to determine
 * copay, coinsurance, and deductible amounts.
 */
export function extractPatientResponsibility(
  claim: ERA835ClaimAdjudication
): PatientResponsibilityBreakdown {
  let copay = 0;
  let coinsurance = 0;
  let deductible = 0;
  let otherAdjustments = 0;

  // Check claim-level adjustments
  for (const adj of claim.adjustmentReasons) {
    if (adj.groupCode !== 'PR') continue;

    if (PR_DEDUCTIBLE_CODES.includes(adj.reasonCode)) {
      deductible += adj.amount;
    } else if (PR_COINSURANCE_CODES.includes(adj.reasonCode)) {
      coinsurance += adj.amount;
    } else if (PR_COPAY_CODES.includes(adj.reasonCode)) {
      copay += adj.amount;
    } else {
      otherAdjustments += adj.amount;
    }
  }

  // Also check service-line level adjustments
  for (const sl of claim.serviceLines) {
    for (const adj of sl.adjustments) {
      if (adj.groupCode !== 'PR') continue;

      if (PR_DEDUCTIBLE_CODES.includes(adj.reasonCode)) {
        deductible += adj.amount;
      } else if (PR_COINSURANCE_CODES.includes(adj.reasonCode)) {
        coinsurance += adj.amount;
      } else if (PR_COPAY_CODES.includes(adj.reasonCode)) {
        copay += adj.amount;
      } else {
        otherAdjustments += adj.amount;
      }
    }
  }

  // Deduplicate: if claim-level and service-level both have PR adjustments,
  // use the patientResponsibility field as ground truth if available
  const totalFromAdjustments = copay + coinsurance + deductible + otherAdjustments;
  if (claim.patientResponsibility > 0 && totalFromAdjustments > claim.patientResponsibility * 1.5) {
    // Likely double-counted — scale down proportionally
    const scale = claim.patientResponsibility / totalFromAdjustments;
    copay = Math.round(copay * scale * 100) / 100;
    coinsurance = Math.round(coinsurance * scale * 100) / 100;
    deductible = Math.round(deductible * scale * 100) / 100;
    otherAdjustments = Math.round(otherAdjustments * scale * 100) / 100;
  }

  return {
    copay: Math.round(copay * 100) / 100,
    coinsurance: Math.round(coinsurance * 100) / 100,
    deductible: Math.round(deductible * 100) / 100,
    otherAdjustments: Math.round(otherAdjustments * 100) / 100,
    totalResponsibility: Math.round(
      (copay + coinsurance + deductible + otherAdjustments) * 100
    ) / 100,
  };
}

// ============================================================================
// Core: Generate Patient Invoice from ERA
// ============================================================================

/**
 * Generates patient invoices from an ERA 835 parse result.
 * Creates one invoice per claim that has patient responsibility > $0.
 */
export function generateInvoicesFromERA(
  eraResult: ERA835ParseResult,
  providerInfo: {
    providerId: string;
    providerName: string;
    providerNpi?: string;
  },
  patientLookup: (memberId: string) => {
    patientId: string;
    patientName: string;
    patientEmail?: string;
    patientPhone?: string;
  } | undefined
): PatientInvoice[] {
  if (!eraResult.success || !eraResult.claims) return [];

  const invoices: PatientInvoice[] = [];
  const now = new Date();
  const invoiceDate = now.toISOString().split('T')[0];
  const dueDate = new Date(
    now.getTime() + DEFAULT_PAYMENT_TERMS_DAYS * 24 * 60 * 60 * 1000
  ).toISOString().split('T')[0];

  for (const claim of eraResult.claims) {
    const responsibility = extractPatientResponsibility(claim);

    // Skip claims with no patient responsibility
    if (responsibility.totalResponsibility <= 0) continue;

    // Look up patient info
    const patient = patientLookup(claim.patientMemberId);

    // Build line items from service lines
    const lineItems: PatientInvoiceLineItem[] = claim.serviceLines.map(sl => {
      // Extract PR adjustments for this service line
      let slCopay = 0;
      let slCoinsurance = 0;
      let slDeductible = 0;
      let slOther = 0;

      for (const adj of sl.adjustments) {
        if (adj.groupCode !== 'PR') continue;
        if (PR_DEDUCTIBLE_CODES.includes(adj.reasonCode)) slDeductible += adj.amount;
        else if (PR_COINSURANCE_CODES.includes(adj.reasonCode)) slCoinsurance += adj.amount;
        else if (PR_COPAY_CODES.includes(adj.reasonCode)) slCopay += adj.amount;
        else slOther += adj.amount;
      }

      return {
        procedureCode: sl.procedureCode,
        description: `Service code ${sl.procedureCode}`, // Would be enriched from CPT lookup
        dateOfService: sl.serviceDate || claim.serviceDateFrom,
        totalCharged: sl.chargedAmount,
        insurancePaid: sl.paidAmount,
        copay: slCopay,
        coinsurance: slCoinsurance,
        deductible: slDeductible,
        otherAdjustment: slOther,
        patientOwes: slCopay + slCoinsurance + slDeductible + slOther,
      };
    });

    const invoice: PatientInvoice = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      invoiceNumber: generateInvoiceNumber(),
      patientId: patient?.patientId ?? claim.patientMemberId,
      patientName: patient?.patientName ?? claim.patientName,
      patientEmail: patient?.patientEmail,
      patientPhone: patient?.patientPhone,
      providerId: providerInfo.providerId,
      providerName: providerInfo.providerName,
      providerNpi: providerInfo.providerNpi,
      payerName: eraResult.payment.payerName,
      payerId: eraResult.payment.payerId,
      claimControlNumber: claim.claimControlNumber,
      eraCheckNumber: eraResult.payment.checkNumber,
      lineItems,
      responsibilityBreakdown: responsibility,
      subtotal: responsibility.totalResponsibility,
      previousBalance: 0, // Would come from existing unpaid invoices
      adjustments: 0,
      totalDue: responsibility.totalResponsibility,
      amountPaid: 0,
      balance: responsibility.totalResponsibility,
      dateOfService: claim.serviceDateFrom,
      invoiceDate,
      dueDate,
      status: 'draft',
      agingBucket: '0-30',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    invoices.push(invoice);
  }

  return invoices;
}

// ============================================================================
// Payment Plan Management
// ============================================================================

/**
 * Creates a payment plan for an invoice, splitting the total into
 * equal installments at the specified frequency.
 */
export function createPaymentPlan(
  invoiceId: string,
  totalAmount: number,
  numberOfInstallments: number,
  frequency: 'weekly' | 'biweekly' | 'monthly' = 'monthly',
  startDate?: string
): PaymentPlan {
  const start = startDate ? new Date(startDate) : new Date();
  const installmentAmount = Math.round((totalAmount / numberOfInstallments) * 100) / 100;

  // Handle rounding: last installment absorbs the difference
  const regularInstallmentTotal = installmentAmount * (numberOfInstallments - 1);
  const lastInstallmentAmount = Math.round((totalAmount - regularInstallmentTotal) * 100) / 100;

  const installments: PaymentPlanInstallment[] = [];

  for (let i = 0; i < numberOfInstallments; i++) {
    const dueDate = new Date(start);

    switch (frequency) {
      case 'weekly':
        dueDate.setDate(dueDate.getDate() + i * 7);
        break;
      case 'biweekly':
        dueDate.setDate(dueDate.getDate() + i * 14);
        break;
      case 'monthly':
        dueDate.setMonth(dueDate.getMonth() + i);
        break;
    }

    installments.push({
      installmentNumber: i + 1,
      dueDate: dueDate.toISOString().split('T')[0],
      amount: i === numberOfInstallments - 1 ? lastInstallmentAmount : installmentAmount,
      status: 'pending',
    });
  }

  return {
    id: `pp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    invoiceId,
    totalAmount,
    numberOfInstallments,
    installmentAmount,
    frequency,
    startDate: start.toISOString().split('T')[0],
    installments,
    status: 'active',
  };
}

/**
 * Records a payment against a payment plan installment.
 */
export function recordInstallmentPayment(
  plan: PaymentPlan,
  installmentNumber: number,
  payment: {
    amount: number;
    paymentMethod: PaymentMethod;
    transactionId?: string;
  }
): PaymentPlan {
  const updatedInstallments = plan.installments.map(inst => {
    if (inst.installmentNumber !== installmentNumber) return inst;
    return {
      ...inst,
      status: 'paid' as const,
      paidDate: new Date().toISOString().split('T')[0],
      paidAmount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
    };
  });

  const allPaid = updatedInstallments.every(inst => inst.status === 'paid');

  return {
    ...plan,
    installments: updatedInstallments,
    status: allPaid ? 'completed' : plan.status,
  };
}

// ============================================================================
// Invoice Status Management
// ============================================================================

/**
 * Records a payment against an invoice, updating the balance and status.
 */
export function recordPayment(
  invoice: PatientInvoice,
  payment: {
    amount: number;
    paymentMethod: PaymentMethod;
    transactionId?: string;
    notes?: string;
  }
): { invoice: PatientInvoice; payment: InvoicePayment } {
  const now = new Date().toISOString();
  const newAmountPaid = invoice.amountPaid + payment.amount;
  const newBalance = Math.max(0, Math.round((invoice.totalDue - newAmountPaid) * 100) / 100);

  let newStatus: InvoiceStatus = invoice.status;
  if (newBalance <= 0) {
    newStatus = 'paid';
  } else if (newAmountPaid > 0) {
    newStatus = 'partial-payment';
  }

  const updatedInvoice: PatientInvoice = {
    ...invoice,
    amountPaid: Math.round(newAmountPaid * 100) / 100,
    balance: newBalance,
    status: newStatus,
    lastPaymentDate: now.split('T')[0],
    updatedAt: now,
  };

  const paymentRecord: InvoicePayment = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    invoiceId: invoice.id,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    transactionId: payment.transactionId,
    paidDate: now.split('T')[0],
    notes: payment.notes,
  };

  return { invoice: updatedInvoice, payment: paymentRecord };
}

/**
 * Updates aging buckets for all outstanding invoices.
 * Call this periodically (e.g., daily) to keep aging data current.
 */
export function calculateAgingBucket(
  invoiceDate: string,
  today?: Date
): '0-30' | '31-60' | '61-90' | '91-120' | '120+' {
  const reference = today ?? new Date();
  const invoice = new Date(invoiceDate);
  const daysDiff = Math.floor(
    (reference.getTime() - invoice.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff <= 30) return '0-30';
  if (daysDiff <= 60) return '31-60';
  if (daysDiff <= 90) return '61-90';
  if (daysDiff <= 120) return '91-120';
  return '120+';
}

// ============================================================================
// Stripe Payment Link Generation
// ============================================================================

/**
 * Helper to call billing edge function (matches billing-engine.ts pattern).
 */
async function billingApi(
  endpoint: string,
  options: RequestInit = {}
): Promise<Record<string, unknown>> {
  const token = localStorage.getItem('supabase.auth.token');
  const authToken = token ? JSON.parse(token)?.access_token : publicAnonKey;

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/billing${endpoint}`,
    {
      ...options,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Billing API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Creates a Stripe payment link for a patient invoice.
 * Returns the URL that can be sent to the patient via email/SMS.
 */
export async function createStripePaymentLink(
  invoice: PatientInvoice
): Promise<{ url: string; paymentLinkId: string } | null> {
  try {
    const result = await billingApi('/create-payment-link', {
      method: 'POST',
      body: JSON.stringify({
        invoiceId: invoice.id,
        amount: Math.round(invoice.balance * 100), // Stripe uses cents
        currency: 'usd',
        description: `Patient Invoice ${invoice.invoiceNumber} — ${invoice.providerName}`,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          patientId: invoice.patientId,
          claimControlNumber: invoice.claimControlNumber,
        },
      }),
    });

    return {
      url: result.url as string,
      paymentLinkId: result.paymentLinkId as string,
    };
  } catch (error) {
    console.error('[patient-invoicing] Error creating Stripe payment link:', error);
    return null;
  }
}

// ============================================================================
// Supabase Persistence
// ============================================================================

/**
 * Saves a patient invoice to Supabase.
 */
export async function saveInvoice(
  invoice: PatientInvoice
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('patient_invoices')
      .insert({
        id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        patient_id: invoice.patientId,
        patient_name: invoice.patientName,
        patient_email: invoice.patientEmail ?? null,
        patient_phone: invoice.patientPhone ?? null,
        patient_address: invoice.patientAddress ?? null,
        provider_id: invoice.providerId,
        provider_name: invoice.providerName,
        provider_npi: invoice.providerNpi ?? null,
        payer_name: invoice.payerName,
        payer_id: invoice.payerId,
        claim_control_number: invoice.claimControlNumber,
        era_check_number: invoice.eraCheckNumber ?? null,
        line_items: invoice.lineItems,
        responsibility_breakdown: invoice.responsibilityBreakdown,
        subtotal: invoice.subtotal,
        previous_balance: invoice.previousBalance,
        adjustments: invoice.adjustments,
        total_due: invoice.totalDue,
        amount_paid: invoice.amountPaid,
        balance: invoice.balance,
        payment_plan: invoice.paymentPlan ?? null,
        stripe_payment_link_id: invoice.stripePaymentLinkId ?? null,
        stripe_payment_link_url: invoice.stripePaymentLinkUrl ?? null,
        date_of_service: invoice.dateOfService,
        invoice_date: invoice.invoiceDate,
        due_date: invoice.dueDate,
        last_payment_date: invoice.lastPaymentDate ?? null,
        status: invoice.status,
        aging_bucket: invoice.agingBucket,
        notes: invoice.notes ?? null,
        created_at: invoice.createdAt,
        updated_at: invoice.updatedAt,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[patient-invoicing] Error saving invoice:', error.message);
      return null;
    }

    return data?.id ?? invoice.id;
  } catch (err) {
    console.error('[patient-invoicing] Unexpected save error:', err);
    return null;
  }
}

/**
 * Updates an existing invoice in Supabase.
 */
export async function updateInvoice(
  invoice: PatientInvoice
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('patient_invoices')
      .update({
        amount_paid: invoice.amountPaid,
        balance: invoice.balance,
        status: invoice.status,
        aging_bucket: invoice.agingBucket,
        last_payment_date: invoice.lastPaymentDate ?? null,
        payment_plan: invoice.paymentPlan ?? null,
        stripe_payment_link_id: invoice.stripePaymentLinkId ?? null,
        stripe_payment_link_url: invoice.stripePaymentLinkUrl ?? null,
        notes: invoice.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);

    if (error) {
      console.error('[patient-invoicing] Error updating invoice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[patient-invoicing] Unexpected update error:', err);
    return false;
  }
}

/**
 * Saves a payment record to Supabase.
 */
export async function savePayment(
  payment: InvoicePayment
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('invoice_payments')
      .insert({
        id: payment.id,
        invoice_id: payment.invoiceId,
        amount: payment.amount,
        payment_method: payment.paymentMethod,
        transaction_id: payment.transactionId ?? null,
        paid_date: payment.paidDate,
        notes: payment.notes ?? null,
      });

    if (error) {
      console.error('[patient-invoicing] Error saving payment:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[patient-invoicing] Unexpected payment save error:', err);
    return false;
  }
}

/**
 * Fetches invoices for a patient with optional status filter.
 */
export async function getInvoicesForPatient(
  patientId: string,
  status?: InvoiceStatus
): Promise<PatientInvoice[]> {
  try {
    let query = supabase
      .from('patient_invoices')
      .select('*')
      .eq('patient_id', patientId)
      .order('invoice_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[patient-invoicing] Error fetching invoices:', error.message);
      return [];
    }

    return (data ?? []).map(mapRowToInvoice);
  } catch (err) {
    console.error('[patient-invoicing] Unexpected fetch error:', err);
    return [];
  }
}

/**
 * Fetches all outstanding invoices for a provider.
 */
export async function getOutstandingInvoices(
  providerId: string
): Promise<PatientInvoice[]> {
  try {
    const { data, error } = await supabase
      .from('patient_invoices')
      .select('*')
      .eq('provider_id', providerId)
      .gt('balance', 0)
      .not('status', 'in', '("paid","written-off")')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('[patient-invoicing] Error fetching outstanding invoices:', error.message);
      return [];
    }

    return (data ?? []).map(mapRowToInvoice);
  } catch (err) {
    console.error('[patient-invoicing] Unexpected fetch error:', err);
    return [];
  }
}

// ============================================================================
// Aging Report
// ============================================================================

/**
 * Generates an aging report for a provider's outstanding patient invoices.
 */
export async function generateAgingReport(
  providerId: string
): Promise<AgingReport> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  try {
    const invoices = await getOutstandingInvoices(providerId);

    const buckets = {
      current: { count: 0, amount: 0 },
      thirtyDay: { count: 0, amount: 0 },
      sixtyDay: { count: 0, amount: 0 },
      ninetyDay: { count: 0, amount: 0 },
      overOneTwenty: { count: 0, amount: 0 },
    };

    const payerMap = new Map<string, { payerName: string; outstanding: number; count: number }>();

    for (const inv of invoices) {
      const bucket = calculateAgingBucket(inv.invoiceDate, today);

      switch (bucket) {
        case '0-30':
          buckets.current.count++;
          buckets.current.amount += inv.balance;
          break;
        case '31-60':
          buckets.thirtyDay.count++;
          buckets.thirtyDay.amount += inv.balance;
          break;
        case '61-90':
          buckets.sixtyDay.count++;
          buckets.sixtyDay.amount += inv.balance;
          break;
        case '91-120':
          buckets.ninetyDay.count++;
          buckets.ninetyDay.amount += inv.balance;
          break;
        case '120+':
          buckets.overOneTwenty.count++;
          buckets.overOneTwenty.amount += inv.balance;
          break;
      }

      const payerEntry = payerMap.get(inv.payerId) ?? {
        payerName: inv.payerName,
        outstanding: 0,
        count: 0,
      };
      payerEntry.outstanding += inv.balance;
      payerEntry.count++;
      payerMap.set(inv.payerId, payerEntry);
    }

    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balance, 0);

    return {
      providerId,
      asOfDate: todayStr,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      buckets: {
        current: { count: buckets.current.count, amount: Math.round(buckets.current.amount * 100) / 100 },
        thirtyDay: { count: buckets.thirtyDay.count, amount: Math.round(buckets.thirtyDay.amount * 100) / 100 },
        sixtyDay: { count: buckets.sixtyDay.count, amount: Math.round(buckets.sixtyDay.amount * 100) / 100 },
        ninetyDay: { count: buckets.ninetyDay.count, amount: Math.round(buckets.ninetyDay.amount * 100) / 100 },
        overOneTwenty: { count: buckets.overOneTwenty.count, amount: Math.round(buckets.overOneTwenty.amount * 100) / 100 },
      },
      byPayer: Array.from(payerMap.entries()).map(([payerId, data]) => ({
        payerId,
        payerName: data.payerName,
        outstanding: Math.round(data.outstanding * 100) / 100,
        invoiceCount: data.count,
      })).sort((a, b) => b.outstanding - a.outstanding),
    };
  } catch (err) {
    console.error('[patient-invoicing] Aging report error:', err);
    return {
      providerId,
      asOfDate: todayStr,
      totalOutstanding: 0,
      buckets: {
        current: { count: 0, amount: 0 },
        thirtyDay: { count: 0, amount: 0 },
        sixtyDay: { count: 0, amount: 0 },
        ninetyDay: { count: 0, amount: 0 },
        overOneTwenty: { count: 0, amount: 0 },
      },
      byPayer: [],
    };
  }
}

// ============================================================================
// Row Mapper
// ============================================================================

function mapRowToInvoice(row: Record<string, unknown>): PatientInvoice {
  return {
    id: row.id as string,
    invoiceNumber: row.invoice_number as string,
    patientId: row.patient_id as string,
    patientName: row.patient_name as string,
    patientEmail: row.patient_email as string | undefined,
    patientPhone: row.patient_phone as string | undefined,
    patientAddress: row.patient_address as PatientInvoice['patientAddress'],
    providerId: row.provider_id as string,
    providerName: row.provider_name as string,
    providerNpi: row.provider_npi as string | undefined,
    payerName: row.payer_name as string,
    payerId: row.payer_id as string,
    claimControlNumber: row.claim_control_number as string,
    eraCheckNumber: row.era_check_number as string | undefined,
    lineItems: (row.line_items as PatientInvoiceLineItem[]) ?? [],
    responsibilityBreakdown: row.responsibility_breakdown as PatientResponsibilityBreakdown,
    subtotal: row.subtotal as number,
    previousBalance: row.previous_balance as number,
    adjustments: row.adjustments as number,
    totalDue: row.total_due as number,
    amountPaid: row.amount_paid as number,
    balance: row.balance as number,
    paymentPlan: row.payment_plan as PaymentPlan | undefined,
    stripePaymentLinkId: row.stripe_payment_link_id as string | undefined,
    stripePaymentLinkUrl: row.stripe_payment_link_url as string | undefined,
    dateOfService: row.date_of_service as string,
    invoiceDate: row.invoice_date as string,
    dueDate: row.due_date as string,
    lastPaymentDate: row.last_payment_date as string | undefined,
    status: row.status as InvoiceStatus,
    agingBucket: row.aging_bucket as PatientInvoice['agingBucket'],
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
