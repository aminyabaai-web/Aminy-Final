/**
 * StandaloneOptimizations
 *
 * Conditionally applies PWA-specific optimizations when the app
 * is running in standalone (installed) mode:
 *
 * 1. Hides browser-chrome-related hints (e.g., "Add to Home Screen" banners)
 * 2. Shows app-specific back navigation when there's no browser back button
 * 3. Adjusts safe areas for notch/status bar/home indicator
 * 4. Applies pull-to-refresh override (PWA handles its own refresh)
 */

import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { useStandaloneMode } from '../hooks/useStandaloneMode';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StandaloneOptimizationsProps {
  /** Wrap your app content */
  children: ReactNode;
  /** Callback when the standalone back button is pressed */
  onBack?: () => void;
  /** Whether to show the back button (default: true when standalone and history > 1) */
  showBackButton?: boolean;
  /** Hide the back button entirely (e.g., on the home/dashboard screen) */
  hideBackButton?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StandaloneOptimizations({
  children,
  onBack,
  showBackButton = true,
  hideBackButton = false,
}: StandaloneOptimizationsProps) {
  const { isStandalone } = useStandaloneMode();

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  }, [onBack]);

  // When not standalone, render children without modifications
  if (!isStandalone) {
    return <>{children}</>;
  }

  const shouldShowBack = showBackButton && !hideBackButton;

  return (
    <div
      className="standalone-wrapper"
      style={{
        // Safe area insets for notch devices (iPhone X+, Android cutouts)
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        // Prevent overscroll bounce in standalone mode
        overscrollBehavior: 'none',
        // Full viewport height accounting for safe areas
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* App-specific back navigation (replaces browser back button) */}
      {shouldShowBack && (
        <div
          className="standalone-back-bar"
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            height: '44px',
            paddingLeft: '8px',
            paddingRight: '8px',
            background: 'transparent',
            pointerEvents: 'none',
          }}
        >
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer',
              color: '#0D1B2A',
              fontSize: '18px',
              lineHeight: 1,
            }}
          >
            {/* Left chevron arrow */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1 }}>{children}</div>

      {/* Inline styles for standalone-specific overrides */}
      <style>{`
        /* Hide any "Add to Home Screen" hints when already installed */
        .standalone-wrapper .browser-install-hint,
        .standalone-wrapper .pwa-install-banner,
        .standalone-wrapper [data-pwa-hint] {
          display: none !important;
        }

        /* Disable pull-to-refresh in standalone mode (app handles its own) */
        .standalone-wrapper {
          overscroll-behavior-y: contain;
        }

        /* iOS status bar tap-to-scroll area */
        .standalone-wrapper .standalone-back-bar {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        /* Adjust bottom nav padding for home indicator */
        .standalone-wrapper .bottom-nav {
          padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
        }

        /* Ensure modals respect safe areas */
        .standalone-wrapper .modal-overlay {
          padding-top: env(safe-area-inset-top, 0px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </div>
  );
}

export default StandaloneOptimizations;
