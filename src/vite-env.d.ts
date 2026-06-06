/// <reference types="vite/client" />

// ============================================================================
// Vite Environment Variables
// ============================================================================
//
// Provides IntelliSense and type safety for import.meta.env.VITE_* variables.
// All VITE_ prefixed vars are optional strings (may be undefined at runtime).
// Required variables are validated at startup by src/lib/env-validation.ts.
//

interface ImportMetaEnv {
  // ---- Core Infrastructure (required) ----
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;

  // ---- Payments (Stripe) ----
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PRICE_CORE_MONTHLY?: string;
  readonly VITE_STRIPE_PRICE_CORE_YEARLY?: string;
  readonly VITE_STRIPE_PRICE_PRO_MONTHLY?: string;
  readonly VITE_STRIPE_PRICE_PRO_YEARLY?: string;
  readonly VITE_STRIPE_PRICE_PROPLUS_MONTHLY?: string;
  readonly VITE_STRIPE_PRICE_PROPLUS_YEARLY?: string;
  readonly VITE_PRICE_STARTER_MONTHLY?: string;
  readonly VITE_PRICE_STARTER_ANNUAL?: string;
  readonly VITE_PRICE_CORE_MONTHLY?: string;
  readonly VITE_PRICE_CORE_ANNUAL?: string;
  readonly VITE_PRICE_PRO_MONTHLY?: string;
  readonly VITE_PRICE_PRO_ANNUAL?: string;
  readonly VITE_PRICE_PROPLUS_MONTHLY?: string;
  readonly VITE_PRICE_PROPLUS_ANNUAL?: string;
  readonly VITE_PRICE_INITIAL_CONSULT?: string;
  readonly VITE_PRICE_FOLLOWUP?: string;
  readonly VITE_PRICE_EMERGENCY?: string;
  readonly VITE_PRICE_EXTENDED?: string;
  readonly VITE_PRICE_BUNDLE_CONSULT_4?: string;
  readonly VITE_PRICE_BUNDLE_CONSULT_8?: string;
  readonly VITE_PRICE_BUNDLE_DEEP_3?: string;
  readonly VITE_PRICE_BUNDLE_DEEP_6?: string;
  readonly VITE_PRICE_BUNDLE_MIXED?: string;

  // ---- Telehealth (Daily.co) ----
  readonly VITE_DAILY_DOMAIN?: string;
  readonly VITE_DAILY_API_KEY?: string;

  // ---- Analytics & Error Tracking ----
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_MIXPANEL_TOKEN?: string;
  readonly VITE_AMPLITUDE_API_KEY?: string;
  readonly VITE_LOGROCKET_APP_ID?: string;

  // ---- Push Notifications ----
  readonly VITE_VAPID_PUBLIC_KEY?: string;

  // ---- CentralReach Integration ----
  readonly VITE_CENTRALREACH_BASE_URL?: string;
  readonly VITE_CENTRALREACH_CLIENT_ID?: string;
  readonly VITE_CENTRALREACH_API_VERSION?: string;
  readonly VITE_CENTRALREACH_ORG_ID?: string;

  // ---- Feature Flags ----
  readonly VITE_B2B_ENABLED?: string;
  readonly VITE_B2G_ENABLED?: string;
  readonly VITE_FISCAL_AGENT_ENABLED?: string;
  readonly VITE_DEV_MODE?: string;
  readonly VITE_USE_MOCK_DATA?: string;
  readonly VITE_USE_EDGE_FUNCTIONS?: string;
  readonly VITE_BACB_SANDBOX?: string;

  // ---- Build Metadata (injected by vite.config.ts / CI) ----
  readonly VITE_APP_VERSION?: string;
  readonly VITE_BUILD_NUMBER?: string;
  readonly VITE_COMMIT_HASH?: string;

  // ---- Backend API ----
  readonly VITE_API_URL?: string;

  // ---- Logging ----
  readonly VITE_LOG_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ============================================================================
// Global Window Extensions
// ============================================================================

declare global {
  interface Window {
    aminyTier?: {
      get: () => string;
      set: (tier: string) => void;
      subscribe?: (callback: (tier: string) => void) => () => void;
    };
    __setCurrentScreen?: (screen: string) => void;
    __navigateToScreen?: (screen: string) => void;
    __setUser?: (user: unknown) => void;
    __openBevelChat?: () => void;
    __closeBevelChat?: () => void;
    __setDevUser?: (overrides: Record<string, unknown>) => void;
    __clearDevUser?: () => void;
    __startInvestorDemo?: () => void;
    aminy?: { updateChildPrefs?: (prefs: unknown) => void; [key: string]: unknown };
  }

  // Web Speech API types
  interface SpeechRecognitionEventMap {
    result: SpeechRecognitionEvent;
    error: SpeechRecognitionErrorEvent;
    end: Event;
    start: Event;
  }

  interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
    addEventListener<K extends keyof SpeechRecognitionEventMap>(
      type: K,
      listener: (ev: SpeechRecognitionEventMap[K]) => void
    ): void;
    removeEventListener<K extends keyof SpeechRecognitionEventMap>(
      type: K,
      listener: (ev: SpeechRecognitionEventMap[K]) => void
    ): void;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  var SpeechRecognition: {
    new (): SpeechRecognitionInstance;
    prototype: SpeechRecognitionInstance;
  };
  var webkitSpeechRecognition: {
    new (): SpeechRecognitionInstance;
    prototype: SpeechRecognitionInstance;
  };
}

export {};
