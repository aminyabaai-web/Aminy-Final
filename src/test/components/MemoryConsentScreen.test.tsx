import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  return new Proxy({}, {
    get: (_target, prop: string) => icon(prop),
  });
});

vi.mock('../../components/ui/button', () => ({
  Button: React.forwardRef(
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLButtonElement>) =>
      React.createElement('button', { ...props, ref }, children),
  ),
}));

vi.mock('../../components/ui/switch', () => ({
  Switch: (props: Record<string, unknown>) =>
    React.createElement('input', { type: 'checkbox', role: 'switch', ...props }),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryConsentScreen } from '../../components/MemoryConsentScreen';

describe('MemoryConsentScreen', () => {
  const defaultProps = {
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<MemoryConsentScreen {...defaultProps} />);
    expect(screen.getByText('Help Aminy remember')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<MemoryConsentScreen {...defaultProps} />);
    expect(screen.getByText(/Aminy works better when it remembers/)).toBeInTheDocument();
  });

  it('renders the toggle label', () => {
    render(<MemoryConsentScreen {...defaultProps} />);
    expect(screen.getByText('Save helpful memories')).toBeInTheDocument();
    expect(screen.getByText(/Remembers important details/)).toBeInTheDocument();
  });

  it('renders "What Aminy remembers" section', () => {
    render(<MemoryConsentScreen {...defaultProps} />);
    expect(screen.getByText('What Aminy remembers')).toBeInTheDocument();
    expect(screen.getByText(/Essential info/)).toBeInTheDocument();
    expect(screen.getByText(/Patterns/)).toBeInTheDocument();
    expect(screen.getByText(/Goals/)).toBeInTheDocument();
  });

  it('renders "Privacy & safety" section', () => {
    render(<MemoryConsentScreen {...defaultProps} />);
    expect(screen.getByText('Privacy & safety')).toBeInTheDocument();
    expect(screen.getByText(/Never stored/)).toBeInTheDocument();
    expect(screen.getByText(/Full control/)).toBeInTheDocument();
  });

  it('renders Continue button', () => {
    render(<MemoryConsentScreen {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('calls onComplete with true when Continue is clicked with default consent', () => {
    render(<MemoryConsentScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(defaultProps.onComplete).toHaveBeenCalledTimes(1);
    expect(defaultProps.onComplete).toHaveBeenCalledWith(true);
  });

  it('calls onComplete with false when consent is toggled off and Continue is clicked', () => {
    render(<MemoryConsentScreen {...defaultProps} defaultConsent={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(defaultProps.onComplete).toHaveBeenCalledWith(false);
  });

  it('renders privacy policy and terms links', () => {
    render(<MemoryConsentScreen {...defaultProps} />);
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms')).toBeInTheDocument();
  });

  it('renders the switch element', () => {
    render(<MemoryConsentScreen {...defaultProps} />);
    // The switch has id="memory-consent"
    const switchEl = document.getElementById('memory-consent');
    expect(switchEl).toBeInTheDocument();
  });

  it('all interactive elements have accessible names', () => {
    render(<MemoryConsentScreen {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAccessibleName();
    });
  });
});
