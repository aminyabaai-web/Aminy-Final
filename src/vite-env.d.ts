/// <reference types="vite/client" />

declare global {
  interface Window {
    aminyTier?: { get: () => string; set: (tier: string) => void; subscribe?: (callback: (tier: string) => void) => (() => void) };
    __setCurrentScreen?: (screen: string) => void;
    __navigateToScreen?: (screen: string) => void;
    __setUser?: (user: any) => void;
    aminy?: { updateChildPrefs?: (prefs: any) => void; [key: string]: any };
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
