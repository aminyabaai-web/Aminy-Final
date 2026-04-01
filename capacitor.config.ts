import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aminy.app',
  appName: 'Aminy',
  webDir: 'build',
  server: {
    // In production, serve from the local bundle
    // For development, uncomment the url below to use live reload:
    // url: 'http://localhost:3001',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#F8F8F6',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT', // Light content on dark background
      backgroundColor: '#0D1B2A',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Haptics: {
      // Use native haptics when available (replaces navigator.vibrate)
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Aminy',
    // Enable background fetch for push notifications
    backgroundColor: '#F8F8F6',
  },
  android: {
    backgroundColor: '#F8F8F6',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set true for dev
  },
};

export default config;
