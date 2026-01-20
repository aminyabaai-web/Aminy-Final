import React from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpFooterLinkProps {
  onHelpOpen: () => void;
  className?: string;
  variant?: 'default' | 'minimal';
}

export function HelpFooterLink({ onHelpOpen, className = '', variant = 'default' }: HelpFooterLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onHelpOpen();
  };

  // Minimal variant for small viewports
  if (variant === 'minimal') {
    return (
      <button
        onClick={handleClick}
        className="help-footer-link-minimal"
        aria-label="Open Help & Safety center"
      >
        Support & Safety
      </button>
    );
  }

  return (
    <div className="help-footer-content">
      <button
        onClick={handleClick}
        className="help-footer-link"
        aria-label="Open Help & Safety center"
      >
        <HelpCircle className="w-4 h-4" />
        Support & Safety
      </button>
    </div>
  );
}

// Standalone text link version for minimal footers
export function HelpFooterTextLink({ onHelpOpen, className = '' }: HelpFooterLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onHelpOpen();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        text-muted-foreground hover:text-accent 
        text-sm font-medium 
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
        rounded px-1 py-0.5
        underline-offset-4 hover:underline
        ${className}
      `}
      aria-label="Open Help & Safety center"
    >
      Support & Safety
    </button>
  );
}

// CSS for footer help link - add to globals.css
export const helpFooterStyles = `
/* Help Footer Safe Area Styling v1 */

/* Main safe area container - non-blocking sticky positioning */
.help-footer-safe-area {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30; /* Below modal CTAs (z-50) but above content */
  pointer-events: none; /* Non-blocking container */
  margin-bottom: env(safe-area-inset-bottom, 0px); /* Respect iOS safe area */
}

/* Content wrapper with proper spacing for CTA/badges stack */
.help-footer-content {
  background: transparent;
  padding: 16px;
  display: flex;
  justify-content: center;
  margin-bottom: 80px; /* Space for typical CTA + badges stack height */
}

/* Interactive link button - only this element receives pointer events */
.help-footer-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 24px; /* Pill-shaped */
  color: var(--muted-foreground);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  pointer-events: auto; /* Only the link is interactive */
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border: none;
}

.help-footer-link:hover {
  color: var(--accent);
  background: rgba(255, 255, 255, 0.98);
  border-color: rgba(8, 145, 178, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(8, 145, 178, 0.08);
}

.help-footer-link:active {
  transform: translateY(0) scale(0.98);
  transition: all 0.1s ease;
}

.help-footer-link:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Minimal variant for small viewports */
.help-footer-safe-area-minimal {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30;
  pointer-events: none;
  margin-bottom: env(safe-area-inset-bottom, 0px);
  padding: 12px;
  display: flex;
  justify-content: center;
}

.help-footer-link-minimal {
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 400;
  text-decoration: underline;
  text-underline-offset: 3px;
  background: none;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.2s ease;
  pointer-events: auto;
  cursor: pointer;
}

.help-footer-link-minimal:hover {
  color: var(--accent);
}

.help-footer-link-minimal:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Responsive spacing adjustments for different screen contexts */

/* Splash screen context - account for trust badges */
.help-footer-safe-area[data-context="splash"] .help-footer-content {
  margin-bottom: 120px; /* Extra space for trust badges + CTA */
}

/* Onboarding context - account for continue button + back button */
.help-footer-safe-area[data-context="onboarding"] .help-footer-content {
  margin-bottom: 100px; /* Space for navigation buttons */
}

/* Benefits/Paywall context - account for subscription CTAs */
.help-footer-safe-area[data-context="benefits"] .help-footer-content,
.help-footer-safe-area[data-context="paywall"] .help-footer-content {
  margin-bottom: 140px; /* Extra space for pricing CTAs */
}

/* Dashboard context - account for bottom navigation */
.help-footer-safe-area[data-context="dashboard"] .help-footer-content {
  margin-bottom: 80px; /* Standard bottom nav height */
}

/* Mobile responsive adjustments */
@media (max-width: 640px) {
  .help-footer-content {
    padding: 12px;
    margin-bottom: 70px; /* Reduced for mobile */
  }
  
  .help-footer-link {
    padding: 10px 16px;
    font-size: 13px;
    gap: 6px;
    border-radius: 20px;
    -webkit-tap-highlight-color: rgba(8, 145, 178, 0.2);
  }
  
  .help-footer-link svg {
    width: 14px;
    height: 14px;
  }
  
  /* Mobile context adjustments */
  .help-footer-safe-area[data-context="splash"] .help-footer-content {
    margin-bottom: 100px;
  }
  
  .help-footer-safe-area[data-context="onboarding"] .help-footer-content {
    margin-bottom: 80px;
  }
  
  .help-footer-safe-area[data-context="benefits"] .help-footer-content,
  .help-footer-safe-area[data-context="paywall"] .help-footer-content {
    margin-bottom: 120px;
  }
  
  .help-footer-safe-area[data-context="dashboard"] .help-footer-content {
    margin-bottom: 70px;
  }
  
  /* Switch to minimal variant on small mobile */
  .help-footer-safe-area {
    display: none;
  }
  
  .help-footer-safe-area-minimal {
    display: flex;
  }
}

/* Very small viewports - always use minimal variant */
@media (max-width: 480px) {
  .help-footer-safe-area {
    display: none !important;
  }
  
  .help-footer-safe-area-minimal {
    display: flex !important;
  }
  
  .help-footer-link-minimal {
    font-size: 12px;
  }
}

/* Safe area adjustments for devices with home indicators */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .help-footer-content {
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  }
  
  .help-footer-safe-area-minimal {
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .help-footer-link {
    background: rgba(30, 41, 59, 0.95);
    border-color: rgba(71, 85, 105, 0.3);
    color: var(--muted-foreground);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  .help-footer-link:hover {
    background: rgba(30, 41, 59, 0.98);
    border-color: rgba(8, 145, 178, 0.4);
    color: rgb(147, 197, 253);
    box-shadow: 0 4px 12px rgba(8, 145, 178, 0.15);
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .help-footer-link {
    background: var(--background) !important;
    border: 2px solid var(--foreground) !important;
    color: var(--foreground) !important;
    font-weight: 600 !important;
    box-shadow: none !important;
  }
  
  .help-footer-link:hover {
    background: var(--muted) !important;
    border-color: var(--foreground) !important;
    transform: none !important;
  }
  
  .help-footer-link-minimal {
    color: var(--foreground) !important;
    font-weight: 600 !important;
    text-decoration: underline !important;
    text-decoration-thickness: 2px !important;
  }
  
  .help-footer-link-minimal:hover {
    color: var(--accent) !important;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .help-footer-link {
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease !important;
  }
  
  .help-footer-link:hover,
  .help-footer-link:active {
    transform: none !important;
  }
  
  .help-footer-link-minimal {
    transition: color 0.2s ease !important;
  }
}

/* iOS touch optimization */
@supports (-webkit-touch-callout: none) {
  .help-footer-link:active {
    transform: scale(0.97);
    -webkit-tap-highlight-color: rgba(8, 145, 178, 0.2);
  }
  
  .help-footer-link-minimal:active {
    -webkit-tap-highlight-color: rgba(8, 145, 178, 0.2);
  }
}

/* Print styles - hide help footer */
@media print {
  .help-footer-safe-area,
  .help-footer-safe-area-minimal {
    display: none !important;
  }
}

/* Focus order - ensure help link is last in tab order */
.help-footer-link,
.help-footer-link-minimal {
  tab-index: 1000; /* High tab index to ensure it's last */
}
`;