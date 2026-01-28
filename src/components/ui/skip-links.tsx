/**
 * Skip Links Component
 *
 * Provides keyboard-accessible skip navigation for screen reader users
 * and keyboard-only users to jump to main content areas.
 */

import React from 'react';
import { cn } from './utils';

interface SkipLink {
  label: string;
  targetId: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
  className?: string;
}

const defaultLinks: SkipLink[] = [
  { label: 'Skip to main content', targetId: 'main-content' },
  { label: 'Skip to navigation', targetId: 'main-navigation' },
];

export function SkipLinks({ links = defaultLinks, className }: SkipLinksProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={cn('skip-links', className)}>
      {links.map((link) => (
        <a
          key={link.targetId}
          href={`#${link.targetId}`}
          onClick={(e) => handleClick(e, link.targetId)}
          className={cn(
            // Hidden by default, visible on focus
            'sr-only focus:not-sr-only',
            // Positioning and sizing
            'fixed top-4 left-4 z-[9999]',
            // Styling
            'bg-primary text-primary-foreground',
            'px-4 py-3 rounded-md',
            'font-medium text-sm',
            // Focus ring
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            // Animation
            'transition-all duration-200',
            // Touch target
            'min-h-[44px] flex items-center',
          )}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

// Landmark wrapper for main content
export function MainContent({
  children,
  className,
  id = 'main-content',
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <main
      id={id}
      tabIndex={-1}
      className={cn('outline-none', className)}
      role="main"
      aria-label="Main content"
    >
      {children}
    </main>
  );
}

// Landmark wrapper for navigation
export function NavigationLandmark({
  children,
  className,
  id = 'main-navigation',
  label = 'Main navigation',
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  label?: string;
}) {
  return (
    <nav
      id={id}
      tabIndex={-1}
      className={cn('outline-none', className)}
      aria-label={label}
    >
      {children}
    </nav>
  );
}

// Screen reader only text component
export function SrOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
      {children}
    </span>
  );
}

// Live region for announcements
export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true,
}: {
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
}) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  );
}

export default SkipLinks;
