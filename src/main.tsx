import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initEnvValidation } from "./lib/env-validation.ts";
import { initSentry } from "./lib/sentry.ts";
// Initialize i18n for internationalization
import "./i18n";
// Mobile safe area support
import { injectSafeAreaStyles } from "./lib/mobile-safe-areas.ts";

// Initialize Sentry first (before anything can error)
initSentry();

// Initialize Google Analytics if configured
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (GA_MEASUREMENT_ID) {
  // Load the gtag.js script dynamically
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Configure GA with measurement ID
  script.onload = () => {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: true,
        cookie_flags: 'SameSite=None;Secure',
      });
    }
  };
}

// Validate environment variables on startup
initEnvValidation();

// Inject mobile safe area styles for iOS/Android
injectSafeAreaStyles();

createRoot(document.getElementById("root")!).render(<App />);
