// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

import React, { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquare, Mail, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { supabase } from '../utils/supabase/client';

const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/make-server-8a022548`;

interface Template {
  id: string;
  name: string;
  preview: string;
  body: string;
}

const BASE_TEMPLATES: Template[] = [
  {
    id: 'session-reminder',
    name: 'Session Reminder',
    preview: 'Remind families about upcoming sessions',
    body: 'Hi {parentFirstName}, just a reminder that {childName} has a session tomorrow at {time} with {providerName}. See you then! — Aminy',
  },
  {
    id: 'homework-instructions',
    name: 'Homework Instructions',
    preview: 'Send weekly practice activities home',
    body: 'Hi {parentFirstName}, here are {childName}’s practice activities this week: [add activities here]. Try these for 5–10 min daily. — {providerName}',
  },
  {
    id: 'progress-update',
    name: 'Progress Update',
    preview: 'Share a quick progress note with the family',
    body: 'Hi {parentFirstName}, quick update on {childName}: [add update here]. Goals for next session: [add goals]. — {providerName}',
  },
  {
    id: 'session-notes-ready',
    name: 'Session Notes Ready',
    preview: 'Notify family that notes are available in Aminy',
    body: 'Hi {parentFirstName}, session notes for {childName}’s visit on {date} are ready in Aminy. — {providerName}',
  },
];

function applyTokens(text: string, patientName?: string, providerName?: string): string {
  const childFirst = patientName?.split(' ')[0] ?? '{childName}';
  const provider = providerName ?? '{providerName}';
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return text
    .replace(/\{childName\}/g, childFirst)
    .replace(/\{providerName\}/g, provider)
    .replace(/\{date\}/g, today)
    .replace(/\{time\}/g, '{time}')
    .replace(/\{parentFirstName\}/g, '{parentFirstName}');
}

export function CommunicationTemplates({
  patientName,
  providerName,
  patientId,
}: {
  patientName?: string;
  providerName?: string;
  patientId?: string;
}) {
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      BASE_TEMPLATES.map((t) => [t.id, applyTokens(t.body, patientName, providerName)])
    )
  );
  const [sending, setSending] = useState<Record<string, 'sms' | 'email' | null>>({});

  function handleTextChange(id: string, value: string) {
    setTexts((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSendSMS(id: string) {
    if (!patientId) {
      toast.error('Select a patient first to send an SMS');
      return;
    }
    setSending((s) => ({ ...s, [id]: 'sms' }));
    try {
      // Look up parent's phone number from their profile
      const { data: child } = await supabase
        .from('children')
        .select('user_id')
        .eq('id', patientId)
        .maybeSingle();

      const parentUserId = child?.user_id as string | undefined;
      if (!parentUserId) {
        toast.error("Couldn't find parent profile for this patient");
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number, full_name')
        .eq('id', parentUserId)
        .maybeSingle();

      if (!profile?.phone_number) {
        toast.error("Parent hasn't added a phone number yet");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';

      const res = await fetch(`${EDGE_BASE}/notifications/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phoneNumber: profile.phone_number, message: texts[id] }),
      });

      if (!res.ok) throw new Error(await res.text());
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
      toast.success('SMS sent!');
    } catch {
      toast.error('SMS failed — check Twilio config');
    } finally {
      setSending((s) => ({ ...s, [id]: null }));
    }
  }

  async function handleSendEmail(id: string) {
    if (!patientId) {
      toast.error('Select a patient first to send an email');
      return;
    }
    setSending((s) => ({ ...s, [id]: 'email' }));
    try {
      const { data: child } = await supabase
        .from('children')
        .select('user_id')
        .eq('id', patientId)
        .maybeSingle();

      const parentUserId = child?.user_id as string | undefined;
      if (!parentUserId) {
        toast.error("Couldn't find parent profile for this patient");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';

      const res = await fetch(`${EDGE_BASE}/email/provider-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          parentUserId,
          subject: `Message from ${providerName ?? 'your provider'} via Aminy`,
          body: texts[id],
          templateName: BASE_TEMPLATES.find((t) => t.id === id)?.name ?? id,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      toast.success('Email sent!');
    } catch {
      toast.error('Email failed — check Resend config');
    } finally {
      setSending((s) => ({ ...s, [id]: null }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-[#1B2733] dark:text-white">Communication Templates</h2>
        <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">
          Edit and send pre-built messages to families via SMS or email.
          {!patientId && <span className="text-amber-600 dark:text-amber-400"> Select a patient from the Clients tab to send.</span>}
        </p>
      </div>

      {BASE_TEMPLATES.map((template) => {
        const isSendingSMS = sending[template.id] === 'sms';
        const isSendingEmail = sending[template.id] === 'email';
        return (
          <Card
            key={template.id}
            className="p-5 bg-white dark:bg-slate-900/60 border border-neutral-200 dark:border-slate-700 rounded-2xl"
          >
            <div className="mb-3">
              <h3 className="text-base font-semibold text-[#1B2733] dark:text-white">{template.name}</h3>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-0.5">{template.preview}</p>
            </div>

            <Textarea
              className="w-full min-h-[96px] text-sm text-[#1B2733] dark:text-white bg-[#FAF7F2] dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#43AA8B]/40 focus:border-[#43AA8B]"
              value={texts[template.id] ?? ''}
              onChange={(e) => handleTextChange(template.id, e.target.value)}
              aria-label={`Edit ${template.name} message`}
            />

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={isSendingSMS || isSendingEmail}
                className="flex items-center gap-1.5 bg-[#43AA8B] hover:bg-[#3a9479] disabled:opacity-50 text-white rounded-xl px-4"
                onClick={() => handleSendSMS(template.id)}
              >
                {isSendingSMS ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                {isSendingSMS ? 'Sending…' : 'Send SMS'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isSendingSMS || isSendingEmail}
                className="flex items-center gap-1.5 border-[#E8E4DF] text-[#1B2733] dark:text-white hover:border-[#43AA8B]/40 hover:bg-[#43AA8B]/10 disabled:opacity-50 rounded-xl px-4"
                onClick={() => handleSendEmail(template.id)}
              >
                {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {isSendingEmail ? 'Sending…' : 'Send Email'}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
