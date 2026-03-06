import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { readFileSync } from 'fs';

// Read version from package.json for build-time injection
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig(({ mode }) => ({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  esbuild: {
    // Strip console.log/debug/warn from production builds (keeps console.error)
    pure: mode === 'production' ? ['console.log', 'console.debug', 'console.warn'] : [],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Aminy\u2122 - ABA Support for Your Family',
        short_name: 'Aminy',
        description: 'AI-powered support for parents of neurodivergent children. Get personalized ABA guidance, behavior tracking, and connect with certified professionals.',
        theme_color: '#0891b2',
        background_color: '#F5F5F5',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'en-US',
        categories: ['health', 'lifestyle', 'education'],
        icons: [
          { src: '/pwa-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: '/pwa-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/pwa-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/pwa-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Ask Aminy',
            short_name: 'Chat',
            description: 'Start a conversation with your AI coach',
            url: '/?tab=chat',
          },
          {
            name: 'Crisis Resources',
            short_name: 'Crisis',
            description: 'Emergency contacts and calming techniques',
            url: '/?screen=crisis-resources',
          },
          {
            name: 'Log Incident',
            short_name: 'Log',
            description: 'Quick log a behavioral incident',
            url: '/?screen=incident-log',
          },
          {
            name: 'Book Session',
            short_name: 'Book',
            description: 'Schedule a telehealth session',
            url: '/?screen=telehealth',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Skip external domains to avoid CSP violations with service worker fetch
        // Google Fonts are cached natively by browsers with long cache headers
        navigateFallbackDenylist: [/^https:\/\/fonts\./],
        runtimeCaching: [
          // Crisis resources — MUST work offline (CacheFirst with long expiry)
          {
            urlPattern: /\/crisis.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'crisis-resources',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 86400 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Supabase API calls — NetworkFirst with fallback to cache
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 86400, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Internal API calls — NetworkFirst
          {
            urlPattern: /\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 86400, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // NOTE: Google Fonts caching removed - browsers cache fonts natively
          // and service worker fetch of cross-origin fonts causes CSP issues
        ],
      },
    }),
  ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'vaul@1.1.2': 'vaul',
        'sonner@2.0.3': 'sonner',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        'figma:asset/6ee92f0834f42dd340e530208a75e78f1e485b26.png': path.resolve(__dirname, './src/assets/6ee92f0834f42dd340e530208a75e78f1e485b26.png'),
        'figma:asset/35ab3eb983f3091e601179cd6ce1629bbe517507.png': path.resolve(__dirname, './src/assets/35ab3eb983f3091e601179cd6ce1629bbe517507.png'),
        'figma:asset/2e39d2a71ccd340d3accf6a7d306e6a6a6781942.png': path.resolve(__dirname, './src/assets/2e39d2a71ccd340d3accf6a7d306e6a6a6781942.png'),
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react/jsx-runtime'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-radix': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-popover',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-accordion',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-switch',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-slot',
            ],
            'vendor-motion': ['motion/react'],
            'vendor-ui': ['sonner', 'lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
    },
  }));