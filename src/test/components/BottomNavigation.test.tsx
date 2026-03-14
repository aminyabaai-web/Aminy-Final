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
vi.mock('lucide-react', () => {
  const icon = (name: string) => {
    const Component = (props: Record<string, unknown>) => <span data-testid={`icon-${name}`} {...props} />;
    Component.displayName = name;
    return Component;
  };
  return {
    Home: icon('Home'),
    MessageCircle: icon('MessageCircle'),
    ClipboardList: icon('ClipboardList'),
    TrendingUp: icon('TrendingUp'),
    Sparkles: icon('Sparkles'),
    MoreHorizontal: icon('MoreHorizontal'),
    Lock: icon('Lock'),
    X: icon('X'),
    User: icon('User'),
    Settings: icon('Settings'),
    ChevronRight: icon('ChevronRight'),
    FolderOpen: icon('FolderOpen'),
    Shield: icon('Shield'),
    Users: icon('Users'),
    BarChart3: icon('BarChart3'),
    Baby: icon('Baby'),
    Heart: icon('Heart'),
  };
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

    // Verify parent tab labels are present
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Junior')).toBeInTheDocument();
    expect(screen.getByText('Care')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('shows provider navigation tabs when userRole is provider', () => {
    render(<BottomNavigation {...defaultProps} userRole="provider" />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);

    // Verify provider tab labels are present
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Patients')).toBeInTheDocument();
    expect(screen.getByText('Aminy')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('calls onNavigate when a tab is clicked', () => {
    const onNavigate = vi.fn();
    render(<BottomNavigation activeTab="home" onNavigate={onNavigate} />);

    const chatTab = screen.getByRole('tab', { name: /chat/i });
    fireEvent.click(chatTab);
    expect(onNavigate).toHaveBeenCalledWith('ask-aminy');

    const juniorTab = screen.getByRole('tab', { name: /junior/i });
    fireEvent.click(juniorTab);
    expect(onNavigate).toHaveBeenCalledWith('junior');
  });

  it('highlights the active tab', () => {
    render(<BottomNavigation activeTab="ask-aminy" onNavigate={vi.fn()} />);

    const chatTab = screen.getByRole('tab', { name: /chat/i });
    expect(chatTab).toHaveAttribute('aria-current', 'page');

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
