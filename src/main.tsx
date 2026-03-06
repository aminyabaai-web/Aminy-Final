// @ts-expect-error - @types/react-dom not installed
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initEnvValidation } from "./lib/env-validation.ts";
import { initSentry } from "./lib/sentry.ts";
// Initialize i18n for internationalization
import "./i18n";
// Mobile safe area support
import { injectSafeAreaStyles } from "./lib/mobile-safe-areas.ts";
// Service worker for offline support
import { registerServiceWorker } from "./lib/service-worker.ts";
// Production-safe logger
import { logger } from "./lib/logger.ts";

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

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for offline support & push notifications
// Only register in production to avoid caching issues during development
if (import.meta.env.PROD) {
  registerServiceWorker().then((registration) => {
    if (registration) {
      logger.info('Service worker registered successfully');
    }
  }).catch((error) => {
    logger.error('Service worker registration failed', error);
  });
}
