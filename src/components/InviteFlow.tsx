// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * InviteFlow — SMS/Email Invite Component
 *
 * Full invite flow for viral referral distribution:
 * 1. Pre-filled invite message with the user's unique referral code
 * 2. Share via SMS (sms: URI), Email (mailto: URI), or Web Share API
 * 3. Contact picker integration (Contact Picker API where supported)
 * 4. Track every invite send to Supabase for funnel analytics
 *
 * Privacy: Only accesses contacts if user explicitly taps "Choose from contacts".
 * The Contact Picker API is user-gated and does not expose the full address book.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  X,
  Send,
  Mail,
  MessageCircle,
  Share2,
  Copy,
  Check,
  Users,
  UserPlus,
  Sparkles,
  ChevronRight,
  Gift,
} from 'lucide-react';
import { getOrCreateReferralCode, getReferralShareMessage } from '../lib/referral-program';
import { trackReferralShare } from '../lib/viral-analytics';
import { supabase } from '../utils/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────

interface InviteFlowProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onInviteSent?: (channel: string, recipientCount: number) => void;
}

interface ContactEntry {
  name: string;
  email?: string;
  phone?: string;
}

type InviteChannel = 'sms' | 'email' | 'native' | 'copy';

// Contact Picker API type (not in default TS lib)
interface ContactPickerAPI {
  select(
    properties: string[],
    options?: { multiple?: boolean }
  ): Promise<Array<{ name?: string[]; email?: string[]; tel?: string[] }>>;
  getProperties(): Promise<string[]>;
}

// ── Helpers ───────────────────────────────────────────────────────────

function supportsContactPicker(): boolean {
  return 'contacts' in navigator && 'ContactsManager' in window;
}

function supportsNativeShare(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

// ── Component ─────────────────────────────────────────────────────────

export function InviteFlow({ userId, userName, onClose, onInviteSent }: InviteFlowProps) {
  const [referralCode, setReferralCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sendingChannel, setSendingChannel] = useState<InviteChannel | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<ContactEntry[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [invitesSentThisSession, setInvitesSentThisSession] = useState(0);

  // Load referral code on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const codeData = await getOrCreateReferralCode(userId);
        if (!cancelled) setReferralCode(codeData.code);
      } catch {
        // Fallback to a generated code (not persisted)
        if (!cancelled) {
          const prefix = userId.slice(0, 4).toUpperCase();
          const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
          setReferralCode(`AMINY-${prefix}-${rand}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const shareMessage = referralCode
    ? getReferralShareMessage(referralCode, userName)
    : { title: '', body: '', url: '' };

  const fullShareText = `${shareMessage.body}\n\n${shareMessage.url}`;

  // ── Tracking helper ───────────────────────────────────────────────

  const trackInvite = useCallback(
    async (channel: InviteChannel, recipientEmail?: string) => {
      try {
        await trackReferralShare(userId, channel === 'native' ? 'social' : channel, recipientEmail);
      } catch {
        // Non-critical — don't block UX
      }
      // Also record in invite_sends table for detailed funnel
      try {
        await supabase.from('invite_sends').insert({
          user_id: userId,
          referral_code: referralCode,
          channel,
          recipient_hint: recipientEmail
            ? `${recipientEmail.slice(0, 3)}***`
            : undefined,
          sent_at: new Date().toISOString(),
        });
      } catch {
        // Non-critical
      }
      setInvitesSentThisSession((prev) => prev + 1);
      onInviteSent?.(channel, 1);
    },
    [userId, referralCode, onInviteSent]
  );

  // ── Share handlers ────────────────────────────────────────────────

  const handleSMS = useCallback(
    (phone?: string) => {
      setSendingChannel('sms');
      const body = encodeURIComponent(fullShareText);
      const recipient = phone ? encodeURIComponent(phone) : '';
      // iOS uses &body=, Android uses ?body= — sms:?body= works on both modern platforms
      const smsUri = recipient
        ? `sms:${recipient}?body=${body}`
        : `sms:?body=${body}`;
      window.open(smsUri, '_self');
      trackInvite('sms');
      setTimeout(() => setSendingChannel(null), 1000);
    },
    [fullShareText, trackInvite]
  );

  const handleEmail = useCallback(
    (emailAddr?: string) => {
      setSendingChannel('email');
      const subject = encodeURIComponent(shareMessage.title);
      const body = encodeURIComponent(fullShareText);
      const to = emailAddr ? encodeURIComponent(emailAddr) : '';
      window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_self');
      trackInvite('email', emailAddr);
      setTimeout(() => setSendingChannel(null), 1000);
    },
    [shareMessage.title, fullShareText, trackInvite]
  );

  const handleNativeShare = useCallback(async () => {
    if (!supportsNativeShare()) return;
    setSendingChannel('native');
    try {
      await navigator.share({
        title: shareMessage.title,
        text: shareMessage.body,
        url: shareMessage.url,
      });
      trackInvite('native');
    } catch {
      // User cancelled — not an error
    } finally {
      setSendingChannel(null);
    }
  }, [shareMessage, trackInvite]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareMessage.url);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = shareMessage.url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    trackInvite('copy');
    setTimeout(() => setCopied(false), 2500);
  }, [shareMessage.url, trackInvite]);

  // ── Contact Picker ────────────────────────────────────────────────

  const handlePickContacts = useCallback(async () => {
    if (!supportsContactPicker()) {
      setShowManualInput(true);
      return;
    }
    try {
      const contactsApi = (navigator as unknown as { contacts: ContactPickerAPI }).contacts;
      const props = await contactsApi.getProperties();
      const selectProps = props.filter((p) => ['name', 'email', 'tel'].includes(p));
      const results = await contactsApi.select(selectProps, { multiple: true });

      const contacts: ContactEntry[] = results.map((c) => ({
        name: c.name?.[0] || 'Contact',
        email: c.email?.[0],
        phone: c.tel?.[0],
      }));

      setSelectedContacts(contacts);
    } catch {
      // User cancelled or API not available — fall back to manual
      setShowManualInput(true);
    }
  }, []);

  // ── Manual input submit ───────────────────────────────────────────

  const handleManualSubmit = useCallback(() => {
    const value = manualInput.trim();
    if (!value) return;

    // Detect if email or phone
    const isEmail = value.includes('@');
    if (isEmail) {
      handleEmail(value);
    } else {
      handleSMS(value);
    }
    setManualInput('');
  }, [manualInput, handleEmail, handleSMS]);

  // ── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="w-8 h-8 border-2 border-[#6B9080] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#5A6B7A] mt-3">Preparing your invite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E8E4DF] px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1B2733]">Invite Friends</h2>
              <p className="text-sm text-[#5A6B7A]">Give $25, get 1 free month</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#8A9BA8] hover:text-[#5A6B7A] hover:bg-[#F0EDE8] transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Reward callout */}
          <div className="bg-gradient-to-r from-[#FAF7F2] to-cyan-50 rounded-xl p-4 border border-[#E8E4DF]">
            <div className="flex items-start gap-3">
              <Gift className="w-5 h-5 text-[#6B9080] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#6B9080]">
                  You both win
                </p>
                <p className="text-sm text-[#6B9080] mt-0.5 leading-relaxed">
                  Your friend gets <strong>$25 credit</strong> toward their first expert session.
                  You get <strong>1 free month</strong> when they subscribe.
                </p>
              </div>
            </div>
          </div>

          {/* Referral code display */}
          <div className="text-center">
            <p className="text-xs text-[#5A6B7A] uppercase tracking-wider mb-1.5">Your referral code</p>
            <div className="inline-flex items-center gap-2 bg-[#FAF7F2] border border-[#E8E4DF] rounded-xl px-4 py-2.5">
              <code className="text-base font-bold text-[#1B2733] tracking-wide">
                {referralCode}
              </code>
              <button
                onClick={handleCopyLink}
                className="p-1 text-[#8A9BA8] hover:text-[#6B9080] transition-colors"
                aria-label="Copy link"
              >
                {copied ? <Check size={16} className="text-[#6B9080]" /> : <Copy size={16} />}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-[#6B9080] mt-1.5 animate-in fade-in">
                Link copied to clipboard
              </p>
            )}
          </div>

          {/* Primary share channels */}
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-[#5A6B7A] uppercase tracking-wider">
              Share via
            </p>

            {/* SMS */}
            <button
              onClick={() => handleSMS()}
              disabled={sendingChannel === 'sms'}
              className="w-full flex items-center gap-3 p-3.5 bg-white border border-[#E8E4DF] rounded-xl hover:border-[#6B9080]/30 hover:bg-[#6B9080]/10/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-[#1B2733]">Text Message</p>
                <p className="text-xs text-[#5A6B7A]">Send a pre-filled SMS invite</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8A9BA8] group-hover:text-primary transition-colors" />
            </button>

            {/* Email */}
            <button
              onClick={() => handleEmail()}
              disabled={sendingChannel === 'email'}
              className="w-full flex items-center gap-3 p-3.5 bg-white border border-[#E8E4DF] rounded-xl hover:border-[#6B9080]/30 hover:bg-[#6B9080]/10/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#EEF4F8] flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-[#1B2733]">Email</p>
                <p className="text-xs text-[#5A6B7A]">Share via your email app</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8A9BA8] group-hover:text-primary transition-colors" />
            </button>

            {/* Native share (mobile) */}
            {supportsNativeShare() && (
              <button
                onClick={handleNativeShare}
                disabled={sendingChannel === 'native'}
                className="w-full flex items-center gap-3 p-3.5 bg-white border border-[#E8E4DF] rounded-xl hover:border-[#6B9080]/30 hover:bg-[#6B9080]/10/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <Share2 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-[#1B2733]">More Options</p>
                  <p className="text-xs text-[#5A6B7A]">WhatsApp, Messenger, and more</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8A9BA8] group-hover:text-primary transition-colors" />
              </button>
            )}

            {/* Contact picker / manual input */}
            {supportsContactPicker() && selectedContacts.length === 0 && (
              <button
                onClick={handlePickContacts}
                className="w-full flex items-center gap-3 p-3.5 bg-white border border-dashed border-[#E8E4DF] rounded-xl hover:border-[#6B9080] hover:bg-[#6B9080]/10/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-[#6B9080]/10 flex items-center justify-center group-hover:bg-[#6B9080]/10 transition-colors">
                  <Users className="w-5 h-5 text-[#6B9080]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-[#1B2733]">Choose from Contacts</p>
                  <p className="text-xs text-[#5A6B7A]">Pick friends directly from your address book</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8A9BA8] group-hover:text-primary transition-colors" />
              </button>
            )}
          </div>

          {/* Selected contacts */}
          {selectedContacts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#5A6B7A] uppercase tracking-wider">
                Send to {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''}
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1.5">
                {selectedContacts.map((contact, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-[#FAF7F2] rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-[#3A4A57] truncate">
                      {contact.name}
                      {contact.email && (
                        <span className="text-[#8A9BA8] text-xs ml-1">({contact.email})</span>
                      )}
                    </span>
                    <button
                      onClick={() => {
                        if (contact.email) handleEmail(contact.email);
                        else if (contact.phone) handleSMS(contact.phone);
                      }}
                      className="text-xs text-[#6B9080] font-medium hover:text-[#6B9080]"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  selectedContacts.forEach((c) => {
                    if (c.email) handleEmail(c.email);
                    else if (c.phone) handleSMS(c.phone);
                  });
                }}
                className="w-full py-2.5 bg-primary hover:bg-primary text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Send size={16} />
                Send All Invites
              </button>
            </div>
          )}

          {/* Manual phone/email entry */}
          {showManualInput && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#5A6B7A] uppercase tracking-wider">
                Enter a phone number or email
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  placeholder="Phone or email..."
                  className="flex-1 px-4 py-2.5 border border-[#E8E4DF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#6B9080]"
                  autoFocus
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={!manualInput.trim()}
                  className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-[#6B9080] transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}

          {!showManualInput && !supportsContactPicker() && (
            <button
              onClick={() => setShowManualInput(true)}
              className="w-full text-center text-sm text-[#6B9080] hover:text-[#6B9080] font-medium py-2"
            >
              Or enter a phone/email manually
            </button>
          )}

          {/* Session stats */}
          {invitesSentThisSession > 0 && (
            <div className="text-center bg-[#6B9080]/10 rounded-xl py-3 animate-in fade-in">
              <div className="flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#6B9080]" />
                <span className="text-sm font-medium text-[#6B9080]">
                  {invitesSentThisSession} invite{invitesSentThisSession > 1 ? 's' : ''} sent this session
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Safe area bottom padding for mobile */}
        <div className="h-2 sm:h-0" />
      </div>
    </div>
  );
}

export default InviteFlow;
