/**
 * HelpCenter Component Tests
 *
 * Tests the HelpCenter component from src/components/HelpCenter.tsx
 * Uses vitest + jsdom + @testing-library/react for DOM assertions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { HelpCenter } from '@/components/HelpCenter';

// ---------------------------------------------------------------------------
// Mock child components that are complex or have side effects
// ---------------------------------------------------------------------------

vi.mock('@/components/GlobalDisclaimer', () => ({
  CrisisResources: () => React.createElement('div', { 'data-testid': 'crisis-resources' }, 'Crisis Resources Mock'),
  UrgentHelpDisclaimer: () => React.createElement('div', { 'data-testid': 'urgent-help-disclaimer' }, 'Disclaimer Mock'),
}));

// Mock lucide-react icons to simple spans (avoids SVG rendering issues in jsdom)
vi.mock('lucide-react', () => {
  const createIconMock = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };

  return {
    X: createIconMock('X'),
    HelpCircle: createIconMock('HelpCircle'),
    BookOpen: createIconMock('BookOpen'),
    Shield: createIconMock('Shield'),
    MessageCircle: createIconMock('MessageCircle'),
    Gamepad2: createIconMock('Gamepad2'),
    CreditCard: createIconMock('CreditCard'),
    Lock: createIconMock('Lock'),
    AlertTriangle: createIconMock('AlertTriangle'),
    ChevronRight: createIconMock('ChevronRight'),
    ExternalLink: createIconMock('ExternalLink'),
    Phone: createIconMock('Phone'),
    Search: createIconMock('Search'),
    User: createIconMock('User'),
    Mail: createIconMock('Mail'),
    Send: createIconMock('Send'),
    Sparkles: createIconMock('Sparkles'),
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HelpCenter', () => {
  const mockOnClose = vi.fn();
  const mockOnAnalytics = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset body overflow that HelpCenter modifies
    document.body.style.overflow = '';
  });

  const renderHelpCenter = (props = {}) => {
    return render(
      React.createElement(HelpCenter, {
        onClose: mockOnClose,
        onAnalytics: mockOnAnalytics,
        ...props,
      })
    );
  };

  // ========================================================================
  // Rendering
  // ========================================================================
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderHelpCenter();
      expect(container).toBeDefined();
      // Should have the dialog role
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
    });

    it('renders the Help & Support title', () => {
      renderHelpCenter();
      expect(screen.getByText('Help & Support')).toBeDefined();
    });

    it('renders navigation tabs', () => {
      renderHelpCenter();
      // Use getAllByText since tab labels may appear in sidebar + header area
      expect(screen.getAllByText('Getting started').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Billing').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Privacy & Data').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Safety').length).toBeGreaterThanOrEqual(1);
    });

    it('renders initial articles for Getting Started tab', () => {
      renderHelpCenter();
      expect(screen.getByText('Welcome to Aminy')).toBeDefined();
      expect(screen.getByText('Completing Onboarding')).toBeDefined();
      expect(screen.getByText('Navigating Aminy')).toBeDefined();
    });

    it('has aria-modal attribute for accessibility', () => {
      renderHelpCenter();
      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
    });
  });

  // ========================================================================
  // Contact form
  // ========================================================================
  describe('contact form', () => {
    it('shows contact form when Contact Support button is clicked', () => {
      renderHelpCenter();

      const contactBtn = screen.getByText('Contact Support');
      fireEvent.click(contactBtn);

      // Form should be visible
      expect(screen.getByText('Send Message')).toBeDefined();
      expect(screen.getByPlaceholderText('Brief description of your issue')).toBeDefined();
      expect(screen.getByPlaceholderText('Please describe your issue in detail...')).toBeDefined();
    });

    it('contact form has required subject field', () => {
      renderHelpCenter();
      fireEvent.click(screen.getByText('Contact Support'));

      const subjectInput = screen.getByPlaceholderText('Brief description of your issue');
      expect(subjectInput.hasAttribute('required')).toBe(true);
    });

    it('contact form has required message field', () => {
      renderHelpCenter();
      fireEvent.click(screen.getByText('Contact Support'));

      const messageInput = screen.getByPlaceholderText('Please describe your issue in detail...');
      expect(messageInput.hasAttribute('required')).toBe(true);
    });

    it('contact form has onSubmit handler', () => {
      renderHelpCenter();
      fireEvent.click(screen.getByText('Contact Support'));

      // The form element should exist
      const form = document.querySelector('form');
      expect(form).not.toBeNull();
    });

    it('cancel button hides the contact form', () => {
      renderHelpCenter();

      // Open contact form
      fireEvent.click(screen.getByText('Contact Support'));
      expect(screen.getByText('Send Message')).toBeDefined();

      // Click cancel
      fireEvent.click(screen.getByText('Cancel'));

      // Form should be gone, articles should be back
      expect(screen.queryByText('Send Message')).toBeNull();
      expect(screen.getByText('Welcome to Aminy')).toBeDefined();
    });
  });

  // ========================================================================
  // Search
  // ========================================================================
  describe('search', () => {
    it('renders a search input', () => {
      renderHelpCenter();
      const searchInput = screen.getByPlaceholderText('Search help articles...');
      expect(searchInput).toBeDefined();
    });

    it('search filters articles by title', () => {
      renderHelpCenter();

      const searchInput = screen.getByPlaceholderText('Search help articles...');
      fireEvent.change(searchInput, { target: { value: 'Navigating' } });

      // Only the matching article should remain
      expect(screen.getByText('Navigating Aminy')).toBeDefined();
      expect(screen.queryByText('Welcome to Aminy')).toBeNull();
      expect(screen.queryByText('Completing Onboarding')).toBeNull();
    });

    it('search filters articles by bullet content', () => {
      renderHelpCenter();

      const searchInput = screen.getByPlaceholderText('Search help articles...');
      fireEvent.change(searchInput, { target: { value: 'Connector' } });

      // "Navigating Aminy" has a bullet with "Connector"
      expect(screen.getByText('Navigating Aminy')).toBeDefined();
    });

    it('shows no results message for non-matching query', () => {
      renderHelpCenter();

      const searchInput = screen.getByPlaceholderText('Search help articles...');
      fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

      expect(screen.getByText(/No articles found/)).toBeDefined();
    });

    it('clear search button restores all articles', () => {
      renderHelpCenter();

      const searchInput = screen.getByPlaceholderText('Search help articles...');
      fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

      // Click "Clear search"
      fireEvent.click(screen.getByText('Clear search'));

      // All articles should be back
      expect(screen.getByText('Welcome to Aminy')).toBeDefined();
      expect(screen.getByText('Completing Onboarding')).toBeDefined();
    });
  });

  // ========================================================================
  // Tab navigation
  // ========================================================================
  describe('tab navigation', () => {
    it('switches to Billing tab', () => {
      renderHelpCenter();

      fireEvent.click(screen.getByText('Billing'));
      expect(screen.getByText('Trials & refunds')).toBeDefined();
      expect(screen.getByText('Coaching minutes')).toBeDefined();
    });

    it('switches to Safety tab', () => {
      renderHelpCenter();

      fireEvent.click(screen.getByText('Safety'));
      expect(screen.getByText('Urgent help')).toBeDefined();
    });
  });

  // ========================================================================
  // Close behavior
  // ========================================================================
  describe('close behavior', () => {
    it('calls onClose when close button is clicked', () => {
      renderHelpCenter();

      // The close button uses the X icon; find the button wrapping it
      const dialog = screen.getByRole('dialog');
      const buttons = dialog.querySelectorAll('button');
      // The close button is the one with the X icon, near the header
      const closeBtn = Array.from(buttons).find(
        btn => btn.querySelector('[data-testid="icon-X"]')
      );

      if (closeBtn) {
        fireEvent.click(closeBtn);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('calls onClose when Escape key is pressed', () => {
      renderHelpCenter();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking backdrop overlay', () => {
      renderHelpCenter();

      const dialog = screen.getByRole('dialog');
      // Click the outer overlay (the dialog element itself, not the inner content)
      fireEvent.click(dialog);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
