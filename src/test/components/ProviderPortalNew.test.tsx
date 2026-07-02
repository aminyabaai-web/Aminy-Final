import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'provider-1' } }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'provider-1',
          name: 'Dr. Sarah Chen',
          credentials: 'BCBA-D',
          type: 'bcba',
          specialties: ['Early Intervention', 'Parent Training'],
          rating: 4.9,
          reviewCount: 47,
          totalPatients: 12,
          sessionsThisMonth: 28,
          earningsThisMonth: 4200,
          needsSetup: false,
        },
        error: null,
      }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  return Object.fromEntries(Object.keys(actual).map((k) => [k, icon(k)]));
});

vi.mock('../../components/ui/card', () => ({
  Card: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { 'data-testid': 'card', ...props }, children),
}));

vi.mock('../../components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}));

vi.mock('../../components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('span', { 'data-testid': 'badge', ...props }, children),
}));

vi.mock('../../components/ui/input', () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement('input', props),
}));

vi.mock('../../components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) =>
    React.createElement('textarea', props),
}));

vi.mock('../../components/Logo', () => ({
  Logo: () => React.createElement('div', { 'data-testid': 'logo' }, 'Logo'),
}));

vi.mock('../../lib/child-profiles', () => ({}));

vi.mock('../../lib/brand-system', () => ({
  brandColors: {},
}));

vi.mock('../../components/provider/CredentialBadge', () => ({
  CredentialBadge: () => React.createElement('span', null, 'Credential'),
  VerifiedBadge: ({ status }: { status: string }) =>
    React.createElement('span', { 'data-testid': 'verified-badge' }, 'Verified'),
}));

vi.mock('../../components/ProviderCredentialingWidget', () => ({
  ProviderCredentialingWidget: () => React.createElement('div', { 'data-testid': 'credentialing-widget' }),
  default: () => React.createElement('div', { 'data-testid': 'credentialing-widget' }),
}));

vi.mock('../../lib/provider-branding', () => ({
  getBranding: vi.fn().mockResolvedValue(null),
  saveBranding: vi.fn(),
}));

vi.mock('../../lib/cpt-codes', () => ({
  CPT_CODES: [],
  getCPTByCode: vi.fn(),
  suggestCPTCodes: vi.fn().mockReturnValue([]),
  validateNoteForCPT: vi.fn(),
}));

vi.mock('../../components/provider/PatientAISummary', () => ({
  PatientAISummary: () => React.createElement('div', null, 'PatientAISummary'),
}));

vi.mock('../../components/provider/ProviderInsightsDashboard', () => ({
  ProviderInsightsDashboard: () => React.createElement('div', null, 'ProviderInsightsDashboard'),
}));

vi.mock('../../components/provider/CareCoordination', () => ({
  CareCoordination: () => React.createElement('div', null, 'CareCoordination'),
}));

vi.mock('../../components/provider/RBTManagement', () => ({
  RBTManagement: () => React.createElement('div', null, 'RBTManagement'),
}));

vi.mock('../../lib/superbill-service', () => ({
  generateSuperbillFromSession: vi.fn(),
  saveSuperbillToSupabase: vi.fn(),
}));

vi.mock('../../components/SuperbillGenerator', () => ({
  default: () => React.createElement('div', null, 'SuperbillGenerator'),
}));

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProviderPortal } from '../../components/ProviderPortal';

describe('ProviderPortal', () => {
  const defaultProps = {
    providerId: 'provider-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<ProviderPortal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Provider Portal')).toBeInTheDocument();
    });
  });

  it('shows the provider name after loading', async () => {
    render(<ProviderPortal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Dr. Sarah Chen')).toBeInTheDocument();
    });
  });

  it('shows provider credentials badge', async () => {
    render(<ProviderPortal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getAllByText('BCBA-D').length).toBeGreaterThan(0);
    });
  });

  it('renders navigation tabs', async () => {
    render(<ProviderPortal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Clients')).toBeInTheDocument();
      expect(screen.getByText('Insights')).toBeInTheDocument();
    });
  });

  it('renders verified badge', async () => {
    render(<ProviderPortal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('verified-badge')).toBeInTheDocument();
    });
  });

  it('shows this month stats section after loading', async () => {
    render(<ProviderPortal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('This Month')).toBeInTheDocument();
    });
  });

  it('shows notification bell icon', async () => {
    render(<ProviderPortal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('icon-Bell')).toBeInTheDocument();
    });
  });

  it('shows refresh button', async () => {
    render(<ProviderPortal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('icon-RefreshCw')).toBeInTheDocument();
    });
  });
});
