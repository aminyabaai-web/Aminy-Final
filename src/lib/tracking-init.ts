// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import { initSentry } from './sentry';

interface WindowWithGtag extends Window {
  gtag?: (...args: [string, ...unknown[]]) => void;
}

export function initTracking(): void {
  initSentry();

  const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!GA_MEASUREMENT_ID || document.querySelector(`script[src*="googletagmanager"]`)) {
    return;
  }

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
