import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Mocks (before component import)
// ============================================================

const singleMock = vi.fn();
const insertMock = vi.fn(() => ({ select: vi.fn(() => ({ single: singleMock })) }));
const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
const fromMock = vi.fn(() => ({ insert: insertMock, update: updateMock }));

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'provider-jwt' } },
        error: null,
      }),
    },
    from: (...args: unknown[]) => fromMock(...(args as [string])),
  },
}));

vi.mock('../../utils/supabase/info', () => ({
  projectId: 'testproj',
  publicAnonKey: 'test-anon-key',
  supabaseFullUrl: 'https://testproj.supabase.co',
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  const cache = new Map<string, ReturnType<typeof icon>>();
  return new Proxy(
    {},
    {
      has: () => true,
      get: (_t, prop) => {
        if (prop === '__esModule') return true;
        if (typeof prop !== 'string' || prop === 'default' || prop === 'then') return undefined;
        if (!cache.has(prop)) cache.set(prop, icon(prop));
        return cache.get(prop);
      },
    },
  );
});

vi.mock('../../components/ui/card', () => ({
  Card: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { 'data-testid': 'card', ...props }, children),
}));
vi.mock('../../components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}));
vi.mock('../../components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  InviteFamiliesPanel,
  parseFamilyRows,
  buildInviteLink,
  INVITE_EMAIL_ROUTE,
  INVITE_SMS_ROUTE,
} from '../../components/provider/InviteFamiliesPanel';
import { toast } from 'sonner';

const fetchMock = vi.fn();

describe('parseFamilyRows (spreadsheet paste)', () => {
  it('parses TSV rows (Excel/Sheets paste): name, email, phone, child', () => {
    const rows = parseFamilyRows('Jordan Smith\tJordan@Email.com\t602-555-0134\tEllie');
    expect(rows).toEqual([
      { name: 'Jordan Smith', email: 'jordan@email.com', phone: '602-555-0134', childName: 'Ellie' },
    ]);
  });

  it('parses CSV rows and bare emails, cell order independent', () => {
    const rows = parseFamilyRows(
      'Dr. Sarah Lee, sarah@aact.com\nsam@email.com\n(480) 555-9821; pat@email.com; Pat Alvarez',
    );
    expect(rows).toEqual([
      { name: 'Dr. Sarah Lee', email: 'sarah@aact.com', phone: '', childName: '' },
      { name: '', email: 'sam@email.com', phone: '', childName: '' },
      { name: 'Pat Alvarez', email: 'pat@email.com', phone: '(480) 555-9821', childName: '' },
    ]);
  });

  it('skips blank lines and lines without an email address', () => {
    const rows = parseFamilyRows('header row without email\n\nJordan, jordan@email.com\n   ');
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('jordan@email.com');
  });
});

describe('InviteFamiliesPanel', () => {
  const props = { providerId: 'provider-1', providerName: 'Dr. Sarah Chen', patientCount: 0 };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    singleMock.mockResolvedValue({ data: { id: 'inv-123' }, error: null });
  });

  it('is expanded when the provider has <5 patients, collapsed link otherwise', () => {
    const { unmount } = render(<InviteFamiliesPanel {...props} patientCount={2} />);
    expect(screen.getByText('Invite your families')).toBeInTheDocument();
    expect(screen.getByLabelText('Parent email 1')).toBeInTheDocument();
    unmount();

    render(<InviteFamiliesPanel {...props} patientCount={12} />);
    expect(screen.getByText('Invite your families to Aminy')).toBeInTheDocument();
    expect(screen.queryByLabelText('Parent email 1')).not.toBeInTheDocument();
  });

  it('creates a provider_invites row and POSTs the email route with the right payload', async () => {
    render(<InviteFamiliesPanel {...props} />);

    fireEvent.change(screen.getByLabelText('Parent name 1'), { target: { value: 'Jordan Smith' } });
    fireEvent.change(screen.getByLabelText('Parent email 1'), { target: { value: 'Jordan@Email.com' } });
    fireEvent.click(screen.getByText(/^Send invite/));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // Attribution row
    expect(fromMock).toHaveBeenCalledWith('provider_invites');
    expect(insertMock).toHaveBeenCalledWith({
      provider_id: 'provider-1',
      parent_name: 'Jordan Smith',
      parent_email: 'jordan@email.com',
      parent_phone: null,
      child_name: null,
    });

    // Email delivery via the deployed /email/welcome route
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://testproj.supabase.co/functions/v1/make-server-8a022548${INVITE_EMAIL_ROUTE}`,
    );
    expect(init.headers.Authorization).toBe('Bearer test-anon-key');
    expect(JSON.parse(init.body)).toEqual({
      email: 'jordan@email.com',
      userName: 'Jordan Smith',
      childName: 'your child',
    });

    await screen.findByText(buildInviteLink('inv-123'));
    expect(toast.success).toHaveBeenCalledWith('1 invite sent');
  });

  it('also sends an attributed SMS when a phone number is provided', async () => {
    render(<InviteFamiliesPanel {...props} />);

    fireEvent.change(screen.getByLabelText('Parent email 1'), { target: { value: 'pat@email.com' } });
    fireEvent.change(screen.getByLabelText('Parent phone 1'), { target: { value: '602-555-0134' } });
    fireEvent.click(screen.getByText(/^Send invite/));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const smsCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith(INVITE_SMS_ROUTE));
    expect(smsCall).toBeTruthy();
    const smsBody = JSON.parse(smsCall![1].body);
    expect(smsBody.phoneNumber).toBe('602-555-0134');
    expect(smsBody.message).toContain('Dr. Sarah Chen invited you to Aminy');
    expect(smsBody.message).toContain(buildInviteLink('inv-123'));
    expect(smsCall![1].headers.Authorization).toBe('Bearer provider-jwt');
  });

  it('marks already-invited families honestly instead of failing the batch', async () => {
    singleMock.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate' } });
    render(<InviteFamiliesPanel {...props} />);

    fireEvent.change(screen.getByLabelText('Parent email 1'), { target: { value: 'dup@email.com' } });
    fireEvent.click(screen.getByText(/^Send invite/));

    await screen.findByText('Already invited');
    expect(fetchMock).not.toHaveBeenCalled(); // no email re-sent for duplicates
  });

  it('surfaces an email delivery failure honestly and records it on the invite row', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    render(<InviteFamiliesPanel {...props} />);

    fireEvent.change(screen.getByLabelText('Parent email 1'), { target: { value: 'fail@email.com' } });
    fireEvent.click(screen.getByText(/^Send invite/));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(updateMock).toHaveBeenCalledWith({ status: 'email_failed' });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'inv-123');
  });

  it('fills rows from a spreadsheet paste', async () => {
    render(<InviteFamiliesPanel {...props} />);

    fireEvent.click(screen.getByText('Paste from spreadsheet'));
    fireEvent.change(screen.getByLabelText('Paste families from spreadsheet'), {
      target: { value: 'Jordan Smith, jordan@email.com\nPat Alvarez, pat@email.com, 480-555-9821' },
    });
    fireEvent.click(screen.getByText('Add these families'));

    expect(screen.getByDisplayValue('jordan@email.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('pat@email.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('480-555-9821')).toBeInTheDocument();
    expect(screen.getByText(/^Send invite/).textContent).toContain('(2)');
  });
});
