import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      limit: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  return new Proxy({}, {
    get: (_target, prop: string) => icon(prop),
  });
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

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    setDrawColor: vi.fn(),
    setFillColor: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    line: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
  })),
}));

vi.mock('../../lib/tier-utils', () => ({
  hasFeature: vi.fn().mockReturnValue(true),
  getTierDisplayName: vi.fn().mockReturnValue('Core'),
}));

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WeeklyOutcomesPDF } from '../../components/WeeklyOutcomesPDF';

describe('WeeklyOutcomesPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<WeeklyOutcomesPDF />);
    expect(screen.getByText('Weekly Outcomes PDF')).toBeInTheDocument();
  });

  it('shows Core Tier badge', () => {
    render(<WeeklyOutcomesPDF />);
    expect(screen.getByText('Core Tier')).toBeInTheDocument();
  });

  it('displays date range text', () => {
    render(<WeeklyOutcomesPDF />);
    expect(screen.getByText(/Last 7 days/)).toBeInTheDocument();
  });

  it('shows download PDF button when user has access', () => {
    render(<WeeklyOutcomesPDF tier="core" />);
    expect(screen.getByText('Download PDF')).toBeInTheDocument();
  });

  it('shows share button when user has access', () => {
    render(<WeeklyOutcomesPDF tier="core" />);
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('shows demo metrics: activities completed', () => {
    render(<WeeklyOutcomesPDF />);
    // Demo data has 12 activities completed out of 15
    expect(screen.getByText('12 / 15')).toBeInTheDocument();
  });

  it('shows routine adherence percentage', () => {
    render(<WeeklyOutcomesPDF />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows goals achieved count', () => {
    render(<WeeklyOutcomesPDF />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders with explicit data prop', () => {
    const data = {
      childName: 'TestChild',
      parentName: 'TestParent',
      weekStart: new Date('2025-01-01'),
      weekEnd: new Date('2025-01-07'),
      activitiesCompleted: 8,
      activitiesPlanned: 10,
      routineAdherence: 90,
      stressLevelAvg: 3.5,
      goalsAchieved: 2,
      goalsInProgress: 3,
      wins: ['First win'],
      challenges: ['A challenge'],
    };
    render(<WeeklyOutcomesPDF data={data} />);
    expect(screen.getByText('8 / 10')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });
});
