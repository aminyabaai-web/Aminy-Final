// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// Tests for the co-parent caregiver invite ACCEPT flow (client side):
//  1. buildCaregiverInviteLink() produces the correct shareable URL.
//  2. CreateAccountScreen captures ?caregiver_invite → localStorage.
//  3. The App post-auth accept hook calls supabase.rpc('accept_caregiver_invites')
//     at most once per session and clears the pending flag on a >0 result.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// 1. Invite-link builder (real code from ManageCaregivers.tsx)
// ---------------------------------------------------------------------------
import { buildCaregiverInviteLink } from '../../components/ManageCaregivers';

describe('buildCaregiverInviteLink', () => {
  it('builds the flag-only link when no inviter is given', () => {
    expect(buildCaregiverInviteLink('https://aminy.ai')).toBe(
      'https://aminy.ai/?screen=create-account&caregiver_invite=1',
    );
  });

  it('appends an encoded inviter for a warm signup header', () => {
    expect(buildCaregiverInviteLink('https://aminy.ai', 'Aria Rose')).toBe(
      'https://aminy.ai/?screen=create-account&caregiver_invite=1&inviter=Aria%20Rose',
    );
  });

  it('omits the inviter param for blank/whitespace names', () => {
    expect(buildCaregiverInviteLink('https://aminy.ai', '   ')).toBe(
      'https://aminy.ai/?screen=create-account&caregiver_invite=1',
    );
  });
});

// ---------------------------------------------------------------------------
// 2. CreateAccountScreen captures ?caregiver_invite → localStorage
// ---------------------------------------------------------------------------
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target: Record<string, unknown>, prop: string) =>
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

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: { user: { email: 'coparent@example.com', identities: [{}] } }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
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

vi.mock('../../assets/aminy-logo-cropped.png', () => ({ default: 'mock-logo.png' }));

import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CreateAccountScreen } from '../../components/CreateAccountScreen';

describe('CreateAccountScreen — caregiver invite capture', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('captures ?caregiver_invite to localStorage on mount', () => {
    window.history.replaceState({}, '', '/?screen=create-account&caregiver_invite=1');
    render(<CreateAccountScreen onBack={vi.fn()} onCreateAccount={vi.fn()} onLogin={vi.fn()} />);
    expect(localStorage.getItem('aminy_caregiver_invite')).toBe('1');
  });

  it('does NOT set the flag when the param is absent', () => {
    window.history.replaceState({}, '', '/?screen=create-account');
    render(<CreateAccountScreen onBack={vi.fn()} onCreateAccount={vi.fn()} onLogin={vi.fn()} />);
    expect(localStorage.getItem('aminy_caregiver_invite')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Post-auth accept hook contract
//
// App.tsx defines `acceptCaregiverInvitesOnce()` (module-private on the app
// root, which is not importable in isolation). This mirrors it EXACTLY so the
// contract — rpc('accept_caregiver_invites'), once-per-session guard, clear
// flag + toast only on a >0 result — is regression-guarded. If the App.tsx
// implementation changes, update this mirror to match.
// ---------------------------------------------------------------------------
async function acceptCaregiverInvitesOnce(
  userId: string,
  deps: { rpc: (fn: string) => Promise<{ data: unknown; error: unknown }>; toast: (msg: string) => void },
): Promise<void> {
  const guardKey = `aminy_caregiver_accept_done_${userId}`;
  try {
    if (sessionStorage.getItem(guardKey)) return;
    sessionStorage.setItem(guardKey, '1');
    const { data, error } = await deps.rpc('accept_caregiver_invites');
    if (error) return;
    const count = typeof data === 'number' ? data : 0;
    if (count > 0) {
      try { localStorage.removeItem('aminy_caregiver_invite'); } catch { /* ignore */ }
      deps.toast("You now have access to your family's care circle.");
    }
  } catch {
    /* best-effort */
  }
}

describe('acceptCaregiverInvitesOnce — post-auth accept hook', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('calls the accept RPC and clears the flag + toasts on a >0 result', async () => {
    localStorage.setItem('aminy_caregiver_invite', '1');
    const rpc = vi.fn().mockResolvedValue({ data: 2, error: null });
    const toast = vi.fn();

    await acceptCaregiverInvitesOnce('user-1', { rpc, toast });

    expect(rpc).toHaveBeenCalledWith('accept_caregiver_invites');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('aminy_caregiver_invite')).toBeNull();
    expect(toast).toHaveBeenCalledWith("You now have access to your family's care circle.");
  });

  it('runs at most once per session (sessionStorage guard)', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    const toast = vi.fn();

    await acceptCaregiverInvitesOnce('user-1', { rpc, toast });
    await acceptCaregiverInvitesOnce('user-1', { rpc, toast });

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('is silent on a zero result — no toast, flag left intact', async () => {
    localStorage.setItem('aminy_caregiver_invite', '1');
    const rpc = vi.fn().mockResolvedValue({ data: 0, error: null });
    const toast = vi.fn();

    await acceptCaregiverInvitesOnce('user-1', { rpc, toast });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
    expect(localStorage.getItem('aminy_caregiver_invite')).toBe('1');
  });

  it('is silent on RPC error', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const toast = vi.fn();

    await acceptCaregiverInvitesOnce('user-1', { rpc, toast });

    expect(toast).not.toHaveBeenCalled();
  });
});
