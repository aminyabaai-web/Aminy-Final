import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

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

vi.mock('../../components/ui/input', () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement('input', props),
}));

vi.mock('../../components/ui/slider', () => ({
  Slider: (props: Record<string, unknown>) =>
    React.createElement('input', { type: 'range', ...props }),
}));

vi.mock('../../components/ui/radio-group', () => ({
  RadioGroup: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', props, children),
  RadioGroupItem: (props: Record<string, unknown>) =>
    React.createElement('input', { type: 'radio', ...props }),
}));

vi.mock('../../components/ui/label', () => ({
  Label: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('label', props, children),
}));

vi.mock('../../components/ui/tooltip', () => ({
  Tooltip: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  TooltipContent: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  TooltipProvider: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  TooltipTrigger: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
}));

vi.mock('../../components/ui/sheet', () => ({
  Sheet: ({ children }: React.PropsWithChildren) => React.createElement('div', { 'data-testid': 'sheet' }, children),
  SheetContent: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  SheetDescription: ({ children }: React.PropsWithChildren) => React.createElement('p', null, children),
  SheetHeader: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  SheetTitle: ({ children }: React.PropsWithChildren) => React.createElement('h2', null, children),
}));

vi.mock('../../components/JrSetupWizard', () => ({
  JrSetupWizard: () => React.createElement('div', { 'data-testid': 'jr-setup-wizard' }, 'JrSetupWizard'),
}));

vi.mock('../../components/JrKidMode', () => ({
  JrKidMode: () => React.createElement('div', { 'data-testid': 'jr-kid-mode' }, 'JrKidMode'),
}));

vi.mock('../../lib/connector-hub', () => ({
  connectorHub: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
  CONNECTOR_EVENTS: {},
}));

vi.mock('../../components/GlobalDisclaimer', () => ({
  GlobalDisclaimer: () => React.createElement('div', null, 'Disclaimer'),
}));

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { JrScreen } from '../../components/JrScreen';

describe('JrScreen', () => {
  const defaultProps = {
    childName: 'Alex Johnson',
    jrProfile: {
      childId: 'child-001',
      speechLevel: 'developing' as const,
      targetSetId: 'ts-001',
      tokenBalance: 42,
      voiceMode: 'auto-captions' as const,
      contentLevel: 'standard' as const,
      difficultyLevel: 3,
      defaultRewardCost: 3,
      topRewards: ['Extra screen time', 'Stickers', 'Special snack'],
      status: 'active' as const,
      fatigueRules: {
        maxSessionMinutes: 20,
        breakAfterErrors: 3,
        cooldownMinutes: 5,
      },
      calibration: {
        difficulty: 3,
        preferredActivities: ['matching', 'sorting'],
        motivators: ['stickers', 'sounds'],
      },
      lastUpdated: new Date('2026-01-15'),
    },
    userTier: 'core',
    connectorData: {
      devices: new Map(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<JrScreen {...defaultProps} />);
    expect(screen.getByText('Aminy Ease')).toBeInTheDocument();
  });

  it('displays the child name greeting', () => {
    render(<JrScreen {...defaultProps} />);
    expect(screen.getByText(/Welcome to Ease!/)).toBeInTheDocument();
  });

  it('displays token balance', () => {
    render(<JrScreen {...defaultProps} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows tokens earned description', () => {
    render(<JrScreen {...defaultProps} />);
    expect(screen.getByText('Tokens earned from sessions')).toBeInTheDocument();
  });

  it('shows preferences heading', () => {
    render(<JrScreen {...defaultProps} />);
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('shows the pair device prompt when no devices', () => {
    render(<JrScreen {...defaultProps} />);
    expect(screen.getByText(/Pair a device to start Ease/)).toBeInTheDocument();
  });

  it('displays sync notice', () => {
    render(<JrScreen {...defaultProps} />);
    expect(screen.getByText(/Ease sessions sync to your plan automatically/)).toBeInTheDocument();
  });

  it('renders with default token balance when no jrProfile', () => {
    const props = { ...defaultProps, jrProfile: undefined };
    render(<JrScreen {...props} />);
    expect(screen.getByText('24')).toBeInTheDocument(); // default token balance
  });
});
