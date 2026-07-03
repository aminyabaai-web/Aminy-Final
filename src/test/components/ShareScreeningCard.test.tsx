import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared BEFORE the module-under-test import
// (FreeScreeningFlow → screening-instruments pulls in encrypted storage +
//  supabase-data on save; same mock setup as FreeScreeningFlow.test.tsx)
// ---------------------------------------------------------------------------

let storageStore: Record<string, string> = {};

vi.mock('../../lib/security/encrypted-storage', () => ({
  syncEncryptedStorage: {
    getItem: vi.fn((key: string) => storageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storageStore[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storageStore[key];
    }),
  },
}));

vi.mock('../../lib/supabase-data', () => ({
  dataService: {
    saveScreeningResult: vi.fn().mockResolvedValue(undefined),
  },
}));

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ShareScreeningCard,
  GENERIC_SHARE_PAYLOAD,
  SCREENING_SHARE_URL,
  ACQUISITION_REF_KEY,
  buildCoParentMessage,
  captureAcquisitionRef,
} from '../../components/ShareScreeningCard';
import { FreeScreeningFlow } from '../../components/FreeScreeningFlow';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Install a navigator.share stub; returns the mock. */
function stubNavigatorShare(): ReturnType<typeof vi.fn> {
  const share = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'share', {
    value: share,
    configurable: true,
    writable: true,
  });
  return share;
}

function removeNavigatorShare() {
  // jsdom has no navigator.share by default, but clean up stubs between tests
  delete (navigator as unknown as Record<string, unknown>).share;
}

/** Install a navigator.clipboard.writeText stub; returns the mock. */
function stubClipboard(): ReturnType<typeof vi.fn> {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
  return writeText;
}

/** Everything the share payloads must NEVER contain (results/PHI leakage). */
function assertNoResultsData(payload: string) {
  expect(payload).not.toMatch(/risk/i);
  expect(payload).not.toMatch(/score/i);
  expect(payload).not.toMatch(/\d+\s*\/\s*\d+/); // e.g. "18/20 flagged items"
  expect(payload).not.toMatch(/flagged/i);
  expect(payload).not.toMatch(/autism|adhd|anxiety|depression/i);
}

// --- Drive FreeScreeningFlow to results (mirrors FreeScreeningFlow.test.tsx) ---

function selectConcernsAndContinue(names: RegExp[]) {
  for (const name of names) fireEvent.click(screen.getByRole('button', { name }));
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

function fillChildInfoAndStart(childName?: string) {
  if (childName) {
    fireEvent.change(screen.getByPlaceholderText('e.g. Liam'), {
      target: { value: childName },
    });
  }
  fireEvent.click(screen.getByRole('button', { name: '18-24 months' }));
  fireEvent.click(screen.getByRole('button', { name: /start screening/i }));
}

function answerThroughToResults() {
  for (let i = 0; i < 80; i++) {
    if (screen.queryByText('Your Results Are Ready')) return;
    const yes = screen.queryByRole('button', { name: 'Yes' });
    if (yes) {
      fireEvent.click(yes);
      continue;
    }
    const cont = screen.queryByRole('button', { name: /continue/i });
    if (cont) fireEvent.click(cont);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShareScreeningCard', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storageStore = {};
    localStorage.clear();
    vi.clearAllMocks();
    // Analytics posts fire-and-forget — stub fetch so no real network happens
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    removeNavigatorShare();
    vi.unstubAllGlobals();
  });

  // ── Renders on the results screen ──────────────────────────────────────

  it('renders at the bottom of FreeScreeningFlow results, below the primary CTA', () => {
    render(<FreeScreeningFlow onBack={vi.fn()} onSignUp={vi.fn()} />);
    selectConcernsAndContinue([/autism \/ development/i]);
    fillChildInfoAndStart();
    answerThroughToResults();

    expect(screen.getByText('Your Results Are Ready')).toBeInTheDocument();
    const card = screen.getByTestId('share-screening-card');
    expect(card).toBeInTheDocument();
    expect(screen.getByText(/know another parent who's wondering\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share the free screening/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send my results to my co-parent/i })).toBeInTheDocument();
    // Consent note is visible before any results are shared
    expect(screen.getByText(/this shares a summary of the results on this screen/i)).toBeInTheDocument();

    // The share card must come AFTER the primary signup CTA in document order
    const primaryCta = screen.getByRole('button', { name: /save results & get started free/i });
    expect(
      primaryCta.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  // ── Generic share: NO results data, ever ───────────────────────────────

  it('generic share payload contains NO risk, score, or concern strings', async () => {
    const share = stubNavigatorShare();
    render(<ShareScreeningCard childName="Liam" riskLevel="high" />);

    fireEvent.click(screen.getByRole('button', { name: /share the free screening/i }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const payload = share.mock.calls[0][0] as { title: string; text: string; url: string };

    expect(payload.title).toBe('Free developmental screening — Aminy');
    expect(payload.url).toBe('https://aminy.ai/?screen=free-screening&ref=parent-share');
    expect(payload.text).toMatch(/free 5-minute check-in/i);
    expect(payload.text).toMatch(/no signup needed/i);

    const flat = `${payload.title} ${payload.text}`;
    assertNoResultsData(flat);
    // Not even the child's name leaks into the generic share
    expect(flat).not.toContain('Liam');
    expect(GENERIC_SHARE_PAYLOAD.url).toContain('ref=parent-share');
  });

  // ── Co-parent share: warm phrase, no raw score ──────────────────────────

  it('co-parent share uses the warm phrase and child name, with no scores or clinical language', async () => {
    const share = stubNavigatorShare();
    render(<ShareScreeningCard childName="Liam" riskLevel="moderate" />);

    fireEvent.click(screen.getByRole('button', { name: /send my results to my co-parent/i }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const payload = share.mock.calls[0][0] as { title: string; text: string };

    expect(payload.text).toContain('I did a screening for Liam on Aminy');
    expect(payload.text).toContain('it suggests talking to a specialist could help');
    expect(payload.text).toContain(SCREENING_SHARE_URL);
    // Warm but leak-free: no numbers, no "risk", no "score", no instrument names
    expect(payload.text).not.toMatch(/\d+\s*\/\s*\d+/);
    expect(payload.text).not.toMatch(/risk/i);
    expect(payload.text).not.toMatch(/score/i);
    expect(payload.text).not.toMatch(/m-chat|psc/i);
  });

  it('co-parent message falls back to "our kid" when no child name was given', () => {
    expect(buildCoParentMessage(undefined, 'high')).toBe(
      `I did a screening for our kid on Aminy — it suggests a professional evaluation could really help. Take a look: ${SCREENING_SHARE_URL}`,
    );
    expect(buildCoParentMessage('  ', 'low')).toContain('for our kid on Aminy');
    // Low-risk phrasing is reassuring, not alarming
    expect(buildCoParentMessage(undefined, 'low')).toContain('reassuring');
  });

  // ── Clipboard fallback ──────────────────────────────────────────────────

  it('falls back to clipboard + "Link copied" when navigator.share is absent', async () => {
    removeNavigatorShare(); // jsdom default: no navigator.share
    const writeText = stubClipboard();
    render(<ShareScreeningCard riskLevel="low" />);

    fireEvent.click(screen.getByRole('button', { name: /share the free screening/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copiedText = writeText.mock.calls[0][0] as string;
    expect(copiedText).toContain(SCREENING_SHARE_URL);
    assertNoResultsData(copiedText);

    expect(await screen.findByText(/link copied/i)).toBeInTheDocument();
  });

  it('co-parent clipboard fallback copies the full warm message and confirms', async () => {
    removeNavigatorShare();
    const writeText = stubClipboard();
    render(<ShareScreeningCard childName="Maya" riskLevel="high" />);

    fireEvent.click(screen.getByRole('button', { name: /send my results to my co-parent/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toBe(buildCoParentMessage('Maya', 'high'));
    expect(await screen.findByText(/message copied/i)).toBeInTheDocument();
  });

  // ── Analytics ───────────────────────────────────────────────────────────

  it('tracks screening_share_tapped with the right mode on each tap', async () => {
    stubNavigatorShare();
    render(<ShareScreeningCard riskLevel="moderate" />);

    fireEvent.click(screen.getByRole('button', { name: /share the free screening/i }));
    fireEvent.click(screen.getByRole('button', { name: /send my results to my co-parent/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const bodies = fetchMock.mock.calls.map((c) => JSON.parse((c[1] as RequestInit).body as string));
    expect(bodies[0].event).toBe('screening_share_tapped');
    expect(bodies[0].properties).toEqual({ mode: 'generic' });
    expect(bodies[1].properties).toEqual({ mode: 'coparent' });
    expect(fetchMock.mock.calls[0][0]).toContain('/analytics/track');
  });

  it('share still works when analytics fetch rejects (silent failure)', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const share = stubNavigatorShare();
    render(<ShareScreeningCard riskLevel="low" />);

    fireEvent.click(screen.getByRole('button', { name: /share the free screening/i }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  });

  // ── Attribution ─────────────────────────────────────────────────────────

  it('captureAcquisitionRef persists ?ref= to localStorage (aminy_acquisition_ref)', () => {
    const original = window.location;
    // jsdom: replace location so search params are readable
    Object.defineProperty(window, 'location', {
      value: new URL('https://aminy.ai/?screen=free-screening&ref=parent-share'),
      configurable: true,
      writable: true,
    });

    try {
      captureAcquisitionRef();
      expect(localStorage.getItem(ACQUISITION_REF_KEY)).toBe('parent-share');
    } finally {
      Object.defineProperty(window, 'location', {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });

  it('captureAcquisitionRef is a no-op without a ref param', () => {
    captureAcquisitionRef(); // default jsdom location has no ?ref=
    expect(localStorage.getItem(ACQUISITION_REF_KEY)).toBeNull();
  });

  it('mounting FreeScreeningFlow captures the ref (share-link landing → attribution)', () => {
    const original = window.location;
    Object.defineProperty(window, 'location', {
      value: new URL('https://aminy.ai/?screen=free-screening&ref=parent-share'),
      configurable: true,
      writable: true,
    });

    try {
      render(<FreeScreeningFlow onBack={vi.fn()} onSignUp={vi.fn()} />);
      expect(localStorage.getItem(ACQUISITION_REF_KEY)).toBe('parent-share');
    } finally {
      Object.defineProperty(window, 'location', {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });
});
