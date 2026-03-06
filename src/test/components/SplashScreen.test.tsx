import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';


vi.mock('../../components/figma/ImageWithFallback', () => ({
  ImageWithFallback: (props: Record<string, unknown>) =>
    React.createElement('img', {
      'data-testid': 'image-with-fallback',
      src: props.src as string,
      alt: props.alt as string,
    }),
}));

vi.mock('../../components/ui/button', () => ({
  Button: React.forwardRef(
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLButtonElement>) =>
      React.createElement('button', { ...props, ref }, children),
  ),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SplashScreen } from '../../components/SplashScreen';

describe('SplashScreen', () => {
  const defaultProps = {
    onGetStarted: vi.fn(),
    onLogin: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SplashScreen {...defaultProps} />);
    expect(screen.getByText('Finally, calm that works.')).toBeInTheDocument();
  });

  it('renders the main headline', () => {
    render(<SplashScreen {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Finally, calm that works.' })).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<SplashScreen {...defaultProps} />);
    expect(screen.getByText(/Aminy uses proven ABA principles/)).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<SplashScreen {...defaultProps} />);
    expect(screen.getByText(/Guided by AI. Grounded in ABA. Built for Family Life./)).toBeInTheDocument();
  });

  it('renders the AI companion strip', () => {
    render(<SplashScreen {...defaultProps} />);
    expect(screen.getByText(/Powered by adaptive AI/)).toBeInTheDocument();
  });

  it('renders the logo image', () => {
    render(<SplashScreen {...defaultProps} />);
    const logos = screen.getAllByTestId('image-with-fallback');
    expect(logos.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Start Your 7-Day Free Trial buttons', () => {
    render(<SplashScreen {...defaultProps} />);
    const trialButtons = screen.getAllByText('Start Your 7-Day Free Trial');
    expect(trialButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onGetStarted when CTA button is clicked', () => {
    render(<SplashScreen {...defaultProps} />);
    const trialButtons = screen.getAllByText('Start Your 7-Day Free Trial');
    fireEvent.click(trialButtons[0]);
    expect(defaultProps.onGetStarted).toHaveBeenCalledTimes(1);
  });

  it('renders sign-in link', () => {
    render(<SplashScreen {...defaultProps} />);
    const signInLinks = screen.getAllByText(/Already have an account/);
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onLogin when sign-in is clicked', () => {
    render(<SplashScreen {...defaultProps} />);
    const signInButtons = screen.getAllByLabelText('Sign in to your existing account');
    fireEvent.click(signInButtons[0]);
    expect(defaultProps.onLogin).toHaveBeenCalledTimes(1);
  });

  it('renders three feature cards', () => {
    render(<SplashScreen {...defaultProps} />);
    expect(screen.getByText('Calm & Predictability')).toBeInTheDocument();
    expect(screen.getByText('Connection & Confidence')).toBeInTheDocument();
    expect(screen.getByText('Science & Simplicity')).toBeInTheDocument();
  });

  it('renders feature descriptions', () => {
    render(<SplashScreen {...defaultProps} />);
    expect(screen.getByText(/ABA-based routines/)).toBeInTheDocument();
    expect(screen.getByText(/Gentle practice that empowers/)).toBeInTheDocument();
    expect(screen.getByText(/Track progress with behavioral insights/)).toBeInTheDocument();
  });

  it('renders trust badges', () => {
    render(<SplashScreen {...defaultProps} />);
    const parentTested = screen.getAllByText('Parent-tested');
    expect(parentTested.length).toBeGreaterThanOrEqual(1);
    const hipaa = screen.getAllByText('HIPAA-conscious');
    expect(hipaa.length).toBeGreaterThanOrEqual(1);
    const bcba = screen.getAllByText('Designed with BCBAs');
    expect(bcba.length).toBeGreaterThanOrEqual(1);
  });

  it('renders no credit card needed text', () => {
    render(<SplashScreen {...defaultProps} />);
    const noCCTexts = screen.getAllByText(/No credit card needed/);
    expect(noCCTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('has accessible main landmark', () => {
    render(<SplashScreen {...defaultProps} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('has key features region', () => {
    render(<SplashScreen {...defaultProps} />);
    expect(screen.getByRole('region', { name: 'Key features' })).toBeInTheDocument();
  });

  it('all interactive elements have accessible names', () => {
    render(<SplashScreen {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAccessibleName();
    });
  });
});
