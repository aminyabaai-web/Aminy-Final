import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  return Object.fromEntries(Object.keys(actual).map((k) => [k, icon(k)]));
});

vi.mock('../../lib/demo-seed', () => ({ isDemoMode: () => false }));

vi.mock('../../utils/supabase/info', () => ({
  projectId: 'testproj',
  publicAnonKey: 'test-anon-key',
}));

// Mutable fixture state referenced lazily by the hoisted supabase mock.
const fixtures = vi.hoisted(() => ({
  session: {
    access_token: 'test-token',
    user: { id: 'provider-1' },
  } as { access_token: string; user: { id: string } } | null,
  providerPatients: [{ id: 'pp1', child_id: 'c1', parent_user_id: 'u1' }] as Array<Record<string, unknown>>,
  child: { name: 'Liam' } as Record<string, unknown> | null,
  parentProfile: {
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    phone_number: '+15551234567',
  } as Record<string, unknown> | null,
}));

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: fixtures.session } }),
    },
    from: (table: string) => {
      if (table === 'provider_patients') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: fixtures.providerPatients, error: null }),
          }),
        };
      }
      if (table === 'children') {
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: fixtures.child, error: null }) }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: fixtures.parentProfile, error: null }) }),
          }),
        };
      }
      return {
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      };
    },
  },
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { toast } from 'sonner';
import { CommunicationTemplates, applySubstitutions } from '../../components/CommunicationTemplates';

const fetchMock = vi.fn();

async function renderAndSelectPatient() {
  render(<CommunicationTemplates providerName="Dr. Rivera" />);
  await screen.findByText('Liam (parent: Sarah)');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pp1' } });
  await screen.findByText(/Tokens will be filled for Liam/);
}

describe('CommunicationTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    fixtures.session = { access_token: 'test-token', user: { id: 'provider-1' } };
    fixtures.providerPatients = [{ id: 'pp1', child_id: 'c1', parent_user_id: 'u1' }];
    fixtures.child = { name: 'Liam' };
    fixtures.parentProfile = {
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      phone_number: '+15551234567',
    };
  });

  describe('token substitution', () => {
    it('substitutes all known tokens', () => {
      const result = applySubstitutions(
        'Hi {parentFirstName}, {childName} has a session at {time} with {providerName} on {date}.',
        {
          parentFirstName: 'Sarah',
          childName: 'Liam',
          time: '2:00 PM',
          providerName: 'Dr. Rivera',
          date: 'July 3, 2026',
        }
      );
      expect(result).toBe(
        'Hi Sarah, Liam has a session at 2:00 PM with Dr. Rivera on July 3, 2026.'
      );
    });

    it('leaves unknown or empty tokens untouched', () => {
      expect(applySubstitutions('Hello {mystery}', {})).toBe('Hello {mystery}');
      expect(applySubstitutions('Hello {name}', { name: '' })).toBe('Hello {name}');
    });

    it('fills tokens in the rendered template when a patient is selected', async () => {
      await renderAndSelectPatient();
      // Session Reminder card should now show the substituted names inline.
      expect(
        screen.getByText(/Hi Sarah, just a reminder that Liam has a session tomorrow/)
      ).toBeInTheDocument();
      expect(screen.queryByText(/\{parentFirstName\}/)).not.toBeInTheDocument();
    });
  });

  describe('send gating', () => {
    it('disables both send buttons when no patient is selected', async () => {
      render(<CommunicationTemplates providerName="Dr. Rivera" />);
      await screen.findByText('Liam (parent: Sarah)');
      for (const btn of screen.getAllByText('Send SMS')) {
        expect(btn.closest('button')).toBeDisabled();
      }
      for (const btn of screen.getAllByText('Send Email')) {
        expect(btn.closest('button')).toBeDisabled();
      }
    });

    it('disables Send SMS with a hint when the parent has no phone on file', async () => {
      fixtures.parentProfile = {
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone_number: null,
      };
      await renderAndSelectPatient();
      for (const btn of screen.getAllByText('Send SMS')) {
        expect(btn.closest('button')).toBeDisabled();
        expect(btn.closest('button')).toHaveAttribute('title', 'No phone number on file');
      }
      expect(screen.getAllByText('No phone number on file').length).toBeGreaterThan(0);
      // Email still available (server resolves the address from the parent user id).
      expect(screen.getAllByText('Send Email')[0].closest('button')).not.toBeDisabled();
    });

    it('shows the consent/logging caption under the composer', async () => {
      render(<CommunicationTemplates providerName="Dr. Rivera" />);
      await screen.findByText('Liam (parent: Sarah)');
      expect(
        screen.getAllByText('Messages are logged to the client record.').length
      ).toBeGreaterThan(0);
    });
  });

  describe('sending', () => {
    it('POSTs the substituted SMS to the notifications/sms route with the session JWT', async () => {
      await renderAndSelectPatient();

      fireEvent.click(screen.getAllByText('Send SMS')[0]);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        'https://testproj.supabase.co/functions/v1/make-server-8a022548/notifications/sms'
      );
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer test-token');
      const body = JSON.parse(init.body);
      expect(body.phoneNumber).toBe('+15551234567');
      expect(body.message).toContain('Hi Sarah');
      expect(body.message).toContain('Liam');
      expect(body.message).toContain('Dr. Rivera');
      expect(body.message).not.toContain('{parentFirstName}');

      // Sent confirmation appears, then no error toast.
      await screen.findByText('Sent ✓');
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('POSTs email sends to the email/provider-message route with the right payload', async () => {
      await renderAndSelectPatient();

      fireEvent.click(screen.getAllByText('Send Email')[0]);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        'https://testproj.supabase.co/functions/v1/make-server-8a022548/email/provider-message'
      );
      expect(init.headers.Authorization).toBe('Bearer test-token');
      const body = JSON.parse(init.body);
      expect(body.parentUserId).toBe('u1');
      expect(body.templateName).toBe('Session Reminder');
      expect(body.subject).toContain('Session Reminder');
      expect(body.body).toContain('Hi Sarah');
      expect(body.body).toContain('Liam');
      await screen.findByText('Sent ✓');
    });

    it('shows an error toast with a Retry action and re-enables the button on failure', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ success: false, error: 'Twilio: boom' }),
      });
      await renderAndSelectPatient();

      fireEvent.click(screen.getAllByText('Send SMS')[0]);

      await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
      const [message, opts] = (toast.error as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(message).toContain('Could not send SMS');
      expect(message).toContain('Twilio: boom');
      expect(opts.action.label).toBe('Retry');

      // Button returns to its idle state and is clickable again.
      const smsButton = screen.getAllByText('Send SMS')[0].closest('button');
      expect(smsButton).not.toBeDisabled();

      // Retry action re-fires the send.
      fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
      opts.action.onClick();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });
  });
});
