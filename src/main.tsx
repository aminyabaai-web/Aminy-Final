// @ts-expect-error - @types/react-dom not installed
import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App.tsx";
import "./index.css";
import { initEnvValidation } from "./lib/env-validation.ts";
import { initSentry } from "./lib/sentry.ts";
// Initialize i18n for internationalization
import "./i18n";
// Mobile safe area support
import { injectSafeAreaStyles } from "./lib/mobile-safe-areas.ts";
// Security modules
import { encryptedStorage } from "./lib/security/encrypted-storage";
import { getOrCreateCSRFToken } from "./lib/security/csrf";
import { runBreachDetection } from "./lib/hipaa-compliance";
import { getSecurityConfig } from "./lib/security/index";
// NOTE: Service worker registration is handled automatically by VitePWA
// (vite-plugin-pwa) with registerType: 'autoUpdate'. No manual registration needed.

// ============================================================================
// Performance Timing
// ============================================================================
performance.mark('aminy-main-start');

interface WindowWithGtag extends Window {
  gtag?: (...args: [string, ...unknown[]]) => void;
}

// Initialize keyboard navigation detection for accessibility
function initKeyboardNavDetection() {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  };

  const handleMouseDown = () => {
    document.body.classList.remove('keyboard-nav');
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('mousedown', handleMouseDown);
}
initKeyboardNavDetection();

// GDPR opt-in: only initialize tracking if user has accepted cookies
const cookieConsent = localStorage.getItem('aminy-cookie-consent');

if (cookieConsent === 'accepted') {
  // Initialize Sentry for error tracking
  initSentry();

  // Initialize Google Analytics if configured
  const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (GA_MEASUREMENT_ID) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    script.onload = () => {
      const win = window as unknown as WindowWithGtag;
      if (typeof win.gtag === 'function') {
        win.gtag('config', GA_MEASUREMENT_ID, {
          send_page_view: true,
          cookie_flags: 'SameSite=None;Secure',
        });
      }
    };
  }
}

// Export for dynamic init after cookie consent is given
export function initTracking() {
  initSentry();
  const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (GA_MEASUREMENT_ID && !document.querySelector(`script[src*="googletagmanager"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    script.onload = () => {
      const win = window as unknown as WindowWithGtag;
      if (typeof win.gtag === 'function') {
        win.gtag('config', GA_MEASUREMENT_ID, {
          send_page_view: true,
          cookie_flags: 'SameSite=None;Secure',
        });
      }
    };
  }
}

// Validate environment variables on startup
initEnvValidation();

// Inject mobile safe area styles for iOS/Android
injectSafeAreaStyles();

// ============================================================================
// Security Initialization
// ============================================================================

// 1. Initialize CSRF token for the session (created once, persists in sessionStorage)
getOrCreateCSRFToken();

// 2. Migrate any existing unencrypted sensitive data to encrypted storage
//    This is async and non-blocking — runs in the background
encryptedStorage.migrateToEncrypted().catch((err) => {
  console.warn('[Security] Encrypted storage migration failed (non-fatal):', err);
});

// 3. Start periodic HIPAA breach detection (runs every 5 minutes by default)
const securityConfig = getSecurityConfig();
let breachDetectionInterval: ReturnType<typeof setInterval> | null = null;

if (securityConfig.breachDetectionEnabled) {
  // Run initial breach detection after a short delay (don't block startup)
  setTimeout(() => {
    try {
      runBreachDetection();
    } catch (err) {
      console.warn('[HIPAA] Initial breach detection failed (non-fatal):', err);
    }
  }, 5000);

  // Schedule periodic breach detection
  breachDetectionInterval = setInterval(() => {
    try {
      runBreachDetection();
    } catch (err) {
      console.warn('[HIPAA] Periodic breach detection failed (non-fatal):', err);
    }
  }, securityConfig.breachDetectionIntervalMs);
}

// Mark HIPAA mode as enabled for the compliance dashboard
localStorage.setItem('aminy-hipaa-enabled', 'true');

// Clean up breach detection on page unload
window.addEventListener('beforeunload', () => {
  if (breachDetectionInterval) {
    clearInterval(breachDetectionInterval);
  }
});

// ============================================================================
// Render
// ============================================================================

const rootElement = document.getElementById('root');

if (!rootElement) {
  // This should never happen unless index.html is corrupted
  document.body.innerHTML =
    '<div style="padding:2rem;font-family:system-ui;text-align:center">' +
    '<h1>Aminy failed to start</h1>' +
    '<p>The application root element is missing. Please try clearing your browser cache and reloading.</p>' +
    '</div>';
  throw new Error('[Aminy] #root element not found in document');
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Measure time from main.tsx entry to first render call
performance.mark('aminy-render-called');
performance.measure('aminy-startup', 'aminy-main-start', 'aminy-render-called');

if (import.meta.env.DEV) {
  const entry = performance.getEntriesByName('aminy-startup')[0];
  if (entry) {
    console.log(`[Perf] main.tsx startup: ${entry.duration.toFixed(1)}ms`);
  }
}

// Service worker registration is handled by VitePWA plugin automatically.
// See vite.config.ts VitePWA({ registerType: 'autoUpdate' }) for configuration.
