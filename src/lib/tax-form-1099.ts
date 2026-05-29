// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * 1099-NEC Generator
 *
 * Aminy pays contracted BCBAs/therapists via Stripe Connect as 1099 contractors
 * (non-employees). At year end, the IRS requires we issue a 1099-NEC for any
 * contractor paid $600+. This module:
 *   1. Aggregates total compensation per provider per tax year from payouts
 *   2. Generates an IRS-form-style PDF (Copy B for the recipient)
 *   3. Saves to provider_tax_forms + Supabase Storage
 *   4. Optional: e-files with IRS via Tax1099/Track1099 API (not built — stub)
 *
 * IRS Form 1099-NEC layout reference:
 *   https://www.irs.gov/forms-pubs/about-form-1099-nec
 *
 * Note: this generates a USABLE document for the contractor, NOT an official
 * pre-printed IRS form. Aminy must e-file with the IRS separately (recommended:
 * tax1099.com — $2.99/form). The contractor's Copy B (what we generate) is
 * what they use to file their personal taxes.
 */

import jsPDF from 'jspdf';
import { supabase } from '../utils/supabase/client';

export interface Provider1099Data {
  providerId: string;
  taxYear: number;
  /** Payer (Aminy LLC) info */
  payer: {
    name: string;        // "Aminy LLC"
    address: string;
    city: string;
    state: string;
    zip: string;
    tin: string;         // Aminy's EIN
    phone: string;
  };
  /** Recipient (provider) info */
  recipient: {
    name: string;        // Full legal name
    address: string;
    city: string;
    state: string;
    zip: string;
    tin: string;         // SSN or EIN (last 4 visible, rest masked)
  };
  /** Non-employee compensation, in dollars */
  nonEmployeeCompensation: number;
  /** Backup withholding (rare) */
  federalTaxWithheld: number;
}

/**
 * Generate a Form 1099-NEC PDF as a Blob. Caller can:
 *   - Save to Supabase Storage
 *   - Download to client
 *   - Email to provider via Resend
 */
export function generate1099NEC(data: Provider1099Data): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  const MARGIN = 36;
  let y = MARGIN;

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Form 1099-NEC — ${data.taxYear}`, MARGIN, y);
  y += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Nonemployee Compensation · Copy B (For Recipient)', MARGIN, y);
  y += 22;

  // PAYER box
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN, y, 270, 90);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text("PAYER'S name, address, TIN, telephone:", MARGIN + 6, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(data.payer.name, MARGIN + 6, y + 28);
  doc.text(data.payer.address, MARGIN + 6, y + 42);
  doc.text(`${data.payer.city}, ${data.payer.state} ${data.payer.zip}`, MARGIN + 6, y + 56);
  doc.text(`TIN: ${data.payer.tin}`, MARGIN + 6, y + 70);
  doc.text(`Phone: ${data.payer.phone}`, MARGIN + 6, y + 84);

  // OMB box (right of payer)
  doc.rect(MARGIN + 270, y, 256, 90);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('OMB No. 1545-0116', MARGIN + 276, y + 12);
  doc.text(`Form 1099-NEC`, MARGIN + 276, y + 26);
  doc.text(`${data.taxYear}`, MARGIN + 276, y + 42);
  doc.setFontSize(7);
  doc.text('Copy B — For Recipient', MARGIN + 276, y + 60);
  doc.text('This is important tax information and is', MARGIN + 276, y + 72);
  doc.text('being furnished to the IRS.', MARGIN + 276, y + 82);
  y += 100;

  // RECIPIENT box
  doc.rect(MARGIN, y, 270, 90);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text("RECIPIENT'S name, address, TIN:", MARGIN + 6, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(data.recipient.name, MARGIN + 6, y + 28);
  doc.text(data.recipient.address, MARGIN + 6, y + 42);
  doc.text(`${data.recipient.city}, ${data.recipient.state} ${data.recipient.zip}`, MARGIN + 6, y + 56);
  doc.text(`TIN: ${maskTIN(data.recipient.tin)}`, MARGIN + 6, y + 70);
  y += 100;

  // Compensation boxes (1, 4)
  doc.rect(MARGIN, y, 270, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('1. Nonemployee compensation', MARGIN + 6, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(formatDollars(data.nonEmployeeCompensation), MARGIN + 6, y + 42);

  doc.rect(MARGIN + 270, y, 256, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('4. Federal income tax withheld', MARGIN + 276, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text(formatDollars(data.federalTaxWithheld), MARGIN + 276, y + 42);
  y += 80;

  // State info (boxes 5-7 — left empty for AZ default; full impl per state)
  doc.rect(MARGIN, y, 526, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('5. State tax withheld          6. State / Payer\'s state no.          7. State income', MARGIN + 6, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('$0.00                              AZ /                              ', MARGIN + 6, y + 34);
  y += 60;

  // Footer instructions
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(
    'Instructions for Recipient: You received this form because you were paid as a non-employee contractor. Report this amount on Schedule C (Form 1040). Keep this copy for your records.',
    MARGIN, y, { maxWidth: 526 }
  );
  y += 30;
  doc.text(
    'Generated by Aminy LLC for the tax year shown above. Questions? Contact contractor-tax@aminy.ai.',
    MARGIN, y, { maxWidth: 526 }
  );

  return doc.output('blob');
}

function formatDollars(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

/** Mask TIN/SSN to last 4 — IRS Copy B convention is to show only the last 4 */
function maskTIN(tin: string): string {
  const clean = tin.replace(/\D/g, '');
  if (clean.length === 9) {
    return `XXX-XX-${clean.slice(-4)}`;  // SSN format
  }
  if (clean.length === 9 && clean.length > 5) {
    return `XX-XXX${clean.slice(-4)}`;  // EIN format
  }
  return `***${clean.slice(-4)}`;
}

/**
 * Aggregate a provider's total annual compensation from Stripe Connect payouts.
 * Returns total in dollars.
 */
export async function calculateProviderAnnualCompensation(providerId: string, taxYear: number): Promise<number> {
  const yearStart = `${taxYear}-01-01T00:00:00Z`;
  const yearEnd = `${taxYear + 1}-01-01T00:00:00Z`;

  // Aggregate from stripe_connect_payouts (or provider_payouts table)
  const { data } = await supabase
    .from('provider_payouts')
    .select('provider_amount_cents')
    .eq('provider_id', providerId)
    .eq('status', 'paid')
    .gte('paid_at', yearStart)
    .lt('paid_at', yearEnd);

  const totalCents = (data || []).reduce((sum, row: any) => sum + (row.provider_amount_cents || 0), 0);
  return totalCents / 100;
}

/**
 * Generate a 1099 for a provider, save to Storage, record in provider_tax_forms,
 * trigger email. Returns the storage URL.
 *
 * Called by year-end batch job (typically Jan 15-Jan 31 for prior year).
 */
export async function issueProvider1099(input: {
  providerId: string;
  taxYear: number;
  recipientLegalName: string;
  recipientAddress: { street: string; city: string; state: string; zip: string };
  recipientTIN: string;
}): Promise<{ storageUrl: string; totalDollars: number; status: 'issued' | 'skipped_below_threshold' }> {
  const totalDollars = await calculateProviderAnnualCompensation(input.providerId, input.taxYear);

  // IRS threshold: $600 minimum to require 1099-NEC
  if (totalDollars < 600) {
    return { storageUrl: '', totalDollars, status: 'skipped_below_threshold' };
  }

  const pdfBlob = generate1099NEC({
    providerId: input.providerId,
    taxYear: input.taxYear,
    payer: {
      name: 'Aminy LLC',
      address: '5070 N. 40th Street, Suite 105',
      city: 'Phoenix',
      state: 'AZ',
      zip: '85018',
      tin: import.meta.env.VITE_AMINY_EIN || 'XX-XXXXXXX',
      phone: '775-MY-AMINY',
    },
    recipient: {
      name: input.recipientLegalName,
      address: input.recipientAddress.street,
      city: input.recipientAddress.city,
      state: input.recipientAddress.state,
      zip: input.recipientAddress.zip,
      tin: input.recipientTIN,
    },
    nonEmployeeCompensation: totalDollars,
    federalTaxWithheld: 0,
  });

  // Upload to Supabase Storage
  const path = `1099-nec/${input.taxYear}/${input.providerId}.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from('provider-tax-forms')
    .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true });

  if (uploadErr) throw new Error(`1099 upload failed: ${uploadErr.message}`);

  const { data: urlData } = supabase.storage
    .from('provider-tax-forms')
    .getPublicUrl(path);

  // Record in DB
  await supabase.from('provider_tax_forms').upsert({
    provider_id: input.providerId,
    tax_year: input.taxYear,
    form_type: '1099-NEC',
    total_compensation_cents: Math.round(totalDollars * 100),
    pdf_url: urlData.publicUrl,
    generated_at: new Date().toISOString(),
  }, { onConflict: 'provider_id,tax_year,form_type' });

  return { storageUrl: urlData.publicUrl, totalDollars, status: 'issued' };
}
