// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// Tests for the gift-redemption CLIENT (RedeemGiftScreen):
//   1. Renders the warm headline and prefills ?code= from the URL.
//   2. Redeem calls supabase.rpc('redeem_gift_code', { p_code }) with the code.
//   3. On ok:true it shows celebratory copy and navigates to the dashboard.
//   4. The three RPC error codes render friendly copy.
//   5. When unauthenticated it persists the code and routes to create-account
//      (mirroring provider/caregiver invite capture) instead of calling the RPC.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Controllable supabase mock (vi.hoisted so the vi.mock factory can close over it) ──
const { mockGetUser, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  },
}));

vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_t: Record<string, unknown>, prop: string) =>
      React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        const { children, ...rest } = props;
        const filtered: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rest)) {
          if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'whileInView', 'variants', 'layout', 'layoutId'].includes(key)) {
            filtered[key] = value;
          }
        }
        return React.createElement(prop, { ...filtered, ref }, children as React.ReactNode);
      }),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const mocked: Record<string, unknown> = {};
  for (const key of Object.keys(actual)) {
    mocked[key] = (props: Record<string, unknown>) =>
      React.createElement('span', { 'data-testid': `icon-${key}`, ...props });
  }
  return mocked;
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RedeemGiftScreen } from '../../components/RedeemGiftScreen';

const authed = () => mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
const anon = () => mockGetUser.mockResolvedValue({ data: { user: null } });

describe('RedeemGiftScreen', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockRpc.mockReset();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('renders the warm headline and prefills ?code from the URL', async () => {
    authed();
    window.history.replaceState({}, '', '/?screen=redeem-gift&code=AMINY-ABCD-EFGH');
    render(<RedeemGiftScreen onBack={vi.fn()} onCreateAccount={vi.fn()} onSuccess={vi.fn()} />);

    expect(await screen.findByText(/You've been gifted Aminy/)).toBeInTheDocument();
    const input = screen.getByLabelText('Gift code') as HTMLInputElement;
    expect(input.value).toBe('AMINY-ABCD-EFGH');
  });

  it('redeem calls rpc("redeem_gift_code") with the code and celebrates + navigates on success', async () => {
    authed();
    mockRpc.mockResolvedValue({ data: { ok: true, tier: 'core' }, error: null });
    const onSuccess = vi.fn();
    render(<RedeemGiftScreen onBack={vi.fn()} onCreateAccount={vi.fn()} onSuccess={onSuccess} />);

    const input = screen.getByLabelText('Gift code');
    fireEvent.change(input, { target: { value: 'AMINY-WXYZ-2345' } });
    const btn = await screen.findByRole('button', { name: /Redeem gift/i });
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);

    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('redeem_gift_code', { p_code: 'AMINY-WXYZ-2345' }),
    );
    expect(await screen.findByText(/You've got 3 months of Aminy Core/)).toBeInTheDocument();
    expect(localStorage.getItem('aminy_gift_code')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
    expect(onSuccess).toHaveBeenCalled();
  });

  it.each([
    ['invalid_code', /doesn't look right/i],
    ['already_redeemed', /already been claimed/i],
    ['not_authenticated', /sign in to claim/i],
  ])('renders friendly copy for the %s error', async (errCode, expected) => {
    authed();
    mockRpc.mockResolvedValue({ data: { ok: false, error: errCode }, error: null });
    render(<RedeemGiftScreen onBack={vi.fn()} onCreateAccount={vi.fn()} onSuccess={vi.fn()} />);

    const input = screen.getByLabelText('Gift code');
    fireEvent.change(input, { target: { value: 'BADCODE' } });
    const btn = await screen.findByRole('button', { name: /Redeem gift/i });
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(expected);
  });

  it('when unauthenticated, persists the code and routes to create-account without calling the RPC', async () => {
    anon();
    const onCreateAccount = vi.fn();
    render(<RedeemGiftScreen onBack={vi.fn()} onCreateAccount={onCreateAccount} onSuccess={vi.fn()} />);

    const input = screen.getByLabelText('Gift code');
    fireEvent.change(input, { target: { value: 'AMINY-GIFT-CODE' } });
    const btn = await screen.findByRole('button', { name: /Sign in to claim/i });
    fireEvent.click(btn);

    expect(localStorage.getItem('aminy_gift_code')).toBe('AMINY-GIFT-CODE');
    expect(onCreateAccount).toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
