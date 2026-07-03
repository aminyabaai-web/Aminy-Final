// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * InviteFamiliesPanel — Viral Loop 1: a provider imports their caseload.
 *
 * Mounted at the top of ProviderPortal's Clients tab. Every provider who
 * invites their families = 10–30 parent installs, all attributed as
 * provider-sourced (client_source 'provider_sourced' on later bookings).
 *
 * Per family:
 *   1. Insert a provider_invites row (RLS: provider owns own rows) — the row id
 *      becomes the attribution token in the invite link
 *      (https://aminy.ai/?screen=create-account&provider_invite={id}).
 *   2. Deliver a branded email via the DEPLOYED make-server route
 *      POST /email/welcome (v1 — see note below).
 *   3. If a phone was given, also send an SMS via POST /notifications/sms with
 *      "{Provider} invited you to Aminy…" + the attributed link.
 *
 * v1 EMAIL NOTE: make-server v163 has no dedicated invite-email route.
 * /email/provider-message requires an EXISTING parentUserId (it resolves the
 * recipient via auth.admin.getUserById), so it cannot reach a family that has
 * no account yet. /email/welcome is the only deployed branded email that
 * accepts a raw address — so v1 sends the Aminy welcome email, and the
 * "Dr {name} invited you" wording + attributed link travel via SMS and via the
 * copyable per-family link shown after sending. A proper
 * /email/provider-invite route is the follow-up (needs a make-server deploy).
 */

import { useState } from 'react';
import {
  UserPlus,
  Upload,
  Loader2,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Send,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { supabase } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// ── Types ─────────────────────────────────────────────────────────────

export interface FamilyRow {
  name: string;
  email: string;
  phone: string;
  childName: string;
}

type RowStatus = 'idle' | 'sending' | 'sent' | 'duplicate' | 'failed';

interface InviteFamiliesPanelProps {
  providerId: string;
  providerName: string;
  /** Current roster size — expanded card when <5 patients, collapsed link otherwise. */
  patientCount: number;
}

// ── Routes (exported for tests) ───────────────────────────────────────

export const MAKE_SERVER_BASE = () =>
  `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;
export const INVITE_EMAIL_ROUTE = '/email/welcome';
export const INVITE_SMS_ROUTE = '/notifications/sms';

export function buildInviteLink(inviteId: string): string {
  return `https://aminy.ai/?screen=create-account&provider_invite=${inviteId}`;
}

// ── Spreadsheet paste parsing ─────────────────────────────────────────
// Same forgiving line format as AACTPartnerSetup.importCsv: one family per
// line, cells split on comma/semicolon/tab (Excel & Google Sheets paste TSV).
// Cell roles are detected, not positional: email = has '@'; phone = 7+ digits;
// first remaining text cell = parent name, second = child name.

function looksLikePhone(cell: string): boolean {
  if (cell.includes('@')) return false;
  const digits = cell.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function parseFamilyRows(text: string): FamilyRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line.includes('@'))
    .map((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean);
      const email = (parts.find((p) => p.includes('@')) || '').toLowerCase();
      const phone = parts.find((p) => looksLikePhone(p)) || '';
      const textCells = parts.filter((p) => p !== phone && !p.includes('@'));
      return {
        name: textCells[0] || '',
        childName: textCells[1] || '',
        email,
        phone,
      };
    });
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const emptyRow = (): FamilyRow => ({ name: '', email: '', phone: '', childName: '' });

// ── Component ─────────────────────────────────────────────────────────

export function InviteFamiliesPanel({ providerId, providerName, patientCount }: InviteFamiliesPanelProps) {
  const [expanded, setExpanded] = useState(patientCount < 5);
  const [rows, setRows] = useState<FamilyRow[]>([emptyRow()]);
  const [rowStatus, setRowStatus] = useState<Record<number, RowStatus>>({});
  const [sentLinks, setSentLinks] = useState<Record<number, string>>({});
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const validRows = rows.filter((r) => EMAIL_RE.test(r.email.trim()));

  const updateRow = (i: number, patch: Partial<FamilyRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const applyPaste = () => {
    const parsed = parseFamilyRows(pasteText);
    if (parsed.length === 0) {
      toast.error('No rows with an email address found in the pasted text');
      return;
    }
    // Replace empty rows, keep already-filled ones
    setRows((prev) => [...prev.filter((r) => r.email.trim() || r.name.trim()), ...parsed]);
    setRowStatus({});
    setPasteText('');
    setShowPaste(false);
    toast.success(`${parsed.length} famil${parsed.length === 1 ? 'y' : 'ies'} added from paste`);
  };

  async function sendOne(row: FamilyRow, index: number): Promise<RowStatus> {
    setRowStatus((s) => ({ ...s, [index]: 'sending' }));
    const email = row.email.trim().toLowerCase();

    // 1. Attribution row — the invite id is the token in the signup link.
    const { data, error } = await supabase
      .from('provider_invites')
      .insert({
        provider_id: providerId,
        parent_name: row.name.trim() || null,
        parent_email: email,
        parent_phone: row.phone.trim() || null,
        child_name: row.childName.trim() || null,
      })
      .select('id')
      .single();

    if (error) {
      // 23505 = unique_violation on (provider_id, parent_email)
      if ((error as { code?: string }).code === '23505') return 'duplicate';
      if (import.meta.env.DEV) console.warn('[InviteFamilies] insert failed:', error.message);
      return 'failed';
    }

    const inviteId = data?.id as string;
    const inviteLink = buildInviteLink(inviteId);
    setSentLinks((s) => ({ ...s, [index]: inviteLink }));

    // 2. Branded email (deployed /email/welcome — see header note).
    let emailOk = false;
    try {
      const res = await fetch(`${MAKE_SERVER_BASE()}${INVITE_EMAIL_ROUTE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email,
          userName: row.name.trim() || 'there',
          childName: row.childName.trim() || 'your child',
        }),
      });
      emailOk = res.ok;
    } catch {
      emailOk = false;
    }

    // 3. Optional SMS — carries the "invited you" wording + attributed link.
    if (row.phone.trim()) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${MAKE_SERVER_BASE()}${INVITE_SMS_ROUTE}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? publicAnonKey}`,
          },
          body: JSON.stringify({
            phoneNumber: row.phone.trim(),
            message: `${providerName} invited you to Aminy — the companion app for your family between sessions. Create your free account: ${inviteLink}`,
          }),
        });
      } catch {
        // SMS is best-effort on top of email — don't fail the invite for it.
      }
    }

    if (!emailOk) {
      // Keep the honest state in the DB too so a resend can target these.
      await supabase.from('provider_invites').update({ status: 'email_failed' }).eq('id', inviteId);
      return 'failed';
    }
    return 'sent';
  }

  const handleSendAll = async () => {
    if (validRows.length === 0 || isSending) return;
    setIsSending(true);
    let sent = 0, dup = 0, failed = 0;

    for (let i = 0; i < rows.length; i++) {
      if (!EMAIL_RE.test(rows[i].email.trim())) continue;
      const status = await sendOne(rows[i], i);
      setRowStatus((s) => ({ ...s, [i]: status }));
      if (status === 'sent') sent++;
      else if (status === 'duplicate') dup++;
      else failed++;
    }

    setIsSending(false);
    if (sent > 0 && failed === 0) {
      toast.success(`${sent} invite${sent === 1 ? '' : 's'} sent${dup > 0 ? ` · ${dup} already invited` : ''}`);
    } else if (sent > 0) {
      toast.warning(`${sent} sent · ${failed} failed — failed rows are marked below, try them again`);
    } else if (dup > 0 && failed === 0) {
      toast.info(`Already invited — ${dup} famil${dup === 1 ? 'y was' : 'ies were'} invited before`);
    } else {
      toast.error('Invites could not be sent. Check your connection and try again.');
    }
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Personal invite link copied — text it to the family');
    } catch {
      toast.error('Unable to copy on this device');
    }
  };

  // Collapsed: quiet one-line entry point for providers with a full roster.
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F6FBFB] border border-[#E8E4DF] rounded-xl text-sm text-[#2A7D99] font-medium hover:border-[#6B9080]/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Invite your families to Aminy
        </span>
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  }

  const statusChip = (i: number) => {
    const st = rowStatus[i];
    if (!st || st === 'idle') return null;
    if (st === 'sending') return <Loader2 className="w-4 h-4 animate-spin text-[#2A7D99]" data-status="sending" />;
    if (st === 'sent') return <Check className="w-4 h-4 text-green-600" data-status="sent" />;
    if (st === 'duplicate') return <span className="text-xs text-amber-600 font-medium whitespace-nowrap" data-status="duplicate">Already invited</span>;
    return <AlertCircle className="w-4 h-4 text-red-500" data-status="failed" />;
  };

  return (
    <Card className="p-4 border-[#6B9080]/20 bg-white">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2A7D99]/10 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-[#2A7D99]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#132F43]">Invite your families</h3>
            <p className="text-sm text-[#5A6B7A] mt-0.5">
              Families you invite get a free Aminy account and connect to your practice — logged as your clients, not marketplace leads.
            </p>
          </div>
        </div>
        {patientCount >= 5 && (
          <button
            onClick={() => setExpanded(false)}
            className="text-sm text-[#8A9BA8] hover:text-[#5A6B7A] flex-shrink-0"
          >
            Hide
          </button>
        )}
      </div>

      {/* Family rows */}
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              aria-label={`Parent name ${i + 1}`}
              placeholder="Parent name"
              value={row.name}
              onChange={(e) => updateRow(i, { name: e.target.value })}
              className="flex-1 min-w-0"
              disabled={isSending || rowStatus[i] === 'sent'}
            />
            <Input
              aria-label={`Parent email ${i + 1}`}
              type="email"
              placeholder="parent@email.com"
              value={row.email}
              onChange={(e) => updateRow(i, { email: e.target.value })}
              className="flex-1 min-w-0"
              disabled={isSending || rowStatus[i] === 'sent'}
            />
            <Input
              aria-label={`Parent phone ${i + 1}`}
              type="tel"
              placeholder="Phone (optional)"
              value={row.phone}
              onChange={(e) => updateRow(i, { phone: e.target.value })}
              className="w-28 flex-shrink-0 hidden sm:block"
              disabled={isSending || rowStatus[i] === 'sent'}
            />
            <div className="w-6 flex items-center justify-center flex-shrink-0">
              {statusChip(i) ?? (
                rows.length > 1 && (
                  <button
                    onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Remove family ${i + 1}`}
                    className="text-[#8A9BA8] hover:text-red-500"
                    disabled={isSending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Per-family personal links after sending — providers can text these */}
      {Object.keys(sentLinks).length > 0 && (
        <div className="mt-3 space-y-1.5">
          {Object.entries(sentLinks).map(([i, link]) =>
            rowStatus[Number(i)] === 'sent' || rowStatus[Number(i)] === 'failed' ? (
              <div key={i} className="flex items-center gap-2 text-xs text-[#5A6B7A]">
                <span className="truncate flex-1 font-mono">{link}</span>
                <button
                  onClick={() => copyLink(link)}
                  aria-label={`Copy invite link for family ${Number(i) + 1}`}
                  className="text-[#2A7D99] hover:text-[#1F6080] flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Paste from spreadsheet */}
      {showPaste && (
        <div className="mt-3 space-y-2">
          <textarea
            aria-label="Paste families from spreadsheet"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={'Paste rows from Excel / Google Sheets — one family per line:\nJordan Smith, jordan@email.com, 602-555-0134, Ellie\nsam@email.com'}
            rows={5}
            className="w-full text-sm font-mono border border-[#E8E4DF] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-[#6B9080]"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={applyPaste} disabled={!pasteText.trim()}>
              <Upload className="w-4 h-4 mr-1.5" />
              Add these families
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowPaste(false); setPasteText(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          onClick={handleSendAll}
          disabled={isSending || validRows.length === 0}
          className="bg-[#2A7D99] hover:bg-[#1F6080] text-white"
          size="sm"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-1.5" />
          )}
          {isSending
            ? 'Sending…'
            : `Send invite${validRows.length > 1 ? `s (${validRows.length})` : ''}`}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          disabled={isSending}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add row
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowPaste((v) => !v)} disabled={isSending}>
          <Upload className="w-4 h-4 mr-1" />
          Paste from spreadsheet
        </Button>
      </div>

      <p className="text-xs text-[#8A9BA8] mt-2">
        Each family gets a branded Aminy welcome email{' '}
        (plus a text with your name when you add a phone number).
      </p>
    </Card>
  );
}

export default InviteFamiliesPanel;
