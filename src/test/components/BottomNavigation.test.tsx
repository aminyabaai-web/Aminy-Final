import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BottomNavigation } from '../../components/BottomNavigation';

// Mock sonner
vi.mock('sonner', () => ({ toast: vi.fn() }));

vi.mock('../../lib/feature-flags', () => ({
  productFlags: { b2bEnabled: true },
}));

// Mock lucide-react icons as simple span elements
// Use importOriginal so any new lucide-react icon used by BottomNavigation is
// automatically available — no more "No X export" errors when icons are added.
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return actual;
});

describe('BottomNavigation', () => {
  const defaultProps = {
    activeTab: 'home',
    onNavigate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<BottomNavigation {...defaultProps} />);
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeInTheDocument();
  });

  it('shows parent navigation tabs by default', () => {
    render(<BottomNavigation {...defaultProps} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);

    // Verify parent tab labels are present (current labels — Aminy AI replaced "Chat" / "Ease")
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('My Plan')).toBeInTheDocument();
    expect(screen.getAllByText('Aminy AI')[0]).toBeInTheDocument();
    expect(screen.getByText('Care')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('shows provider navigation tabs when userRole is provider', () => {
    render(<BottomNavigation {...defaultProps} userRole="provider" />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);

    // Verify provider tab labels are present (current labels — provider uses Clients/Notes)
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getAllByText('Aminy AI')[0]).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('calls onNavigate when a tab is clicked', () => {
    const onNavigate = vi.fn();
    render(<BottomNavigation activeTab="home" onNavigate={onNavigate} />);

    // Center tab → opens BevelChatOverlay (App.tsx intercepts and calls setBevelChatOpen)
    const aiTab = screen.getByRole('tab', { name: /aminy ai/i });
    fireEvent.click(aiTab);
    expect(onNavigate).toHaveBeenCalledWith('ask-aminy');

    const planTab = screen.getByRole('tab', { name: /my plan/i });
    fireEvent.click(planTab);
    expect(onNavigate).toHaveBeenCalledWith('care-plan');
  });

  it('highlights the active tab', () => {
    render(<BottomNavigation activeTab="ask-aminy" onNavigate={vi.fn()} />);

    const aiTab = screen.getByRole('tab', { name: /aminy ai/i });
    expect(aiTab).toHaveAttribute('aria-current', 'page');

    const homeTab = screen.getByRole('tab', { name: /home/i });
    expect(homeTab).not.toHaveAttribute('aria-current');
  });

  it('renders without optional props (only required: activeTab, onNavigate)', () => {
    render(<BottomNavigation activeTab="home" onNavigate={vi.fn()} />);
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeInTheDocument();

    // Should default to parent tabs when no userRole is given
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Care')).toBeInTheDocument();
  });
});
