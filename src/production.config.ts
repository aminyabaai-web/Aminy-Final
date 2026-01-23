// ===== PHASE 3: PRODUCTION CONFIGURATION =====

export const productionConfig = {
  // App Information
  app: {
    name: 'Aminy',
    version: '1.0.0',
    description: 'AI-powered guidance for parents of children with developmental needs',
    author: 'Aminy Team',
    homepage: 'https://aminy.app',
    repository: 'https://github.com/aminy/app',
    license: 'Proprietary'
  },

  // Feature Flags
  features: {
    // Core features
    askAminy: true,
    carePlans: true,
    reportExports: true,
    messaging: true,
    juniorMode: true,
    
    // Premium features
    careTeam: true,
    videoSessions: true,
    advancedReports: true,
    
    // Experimental features (toggle these for A/B testing)
    voiceInput: true,
    offlineMode: true,
    pushNotifications: true,
    
    // Developer features
    devPanel: process.env.NODE_ENV === 'development',
    performanceMonitoring: true,
    errorReporting: true
  },

  // API Configuration
  api: {
    baseUrl: process.env.NODE_ENV === 'production' 
      ? 'https://api.aminy.app' 
      : 'http://localhost:3001',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },

  // Analytics Configuration
  // SECURITY: Always read from environment variables, never hardcode
  analytics: {
    enabled: true,
    googleAnalytics: {
      measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || '',
      enabled: !!import.meta.env.VITE_GA_MEASUREMENT_ID
    },
    mixpanel: {
      token: import.meta.env.VITE_MIXPANEL_TOKEN || '',
      enabled: !!import.meta.env.VITE_MIXPANEL_TOKEN
    },
    amplitude: {
      apiKey: import.meta.env.VITE_AMPLITUDE_API_KEY || '',
      enabled: !!import.meta.env.VITE_AMPLITUDE_API_KEY
    }
  },

  // Error Reporting Configuration
  // SECURITY: Always read from environment variables, never hardcode
  errorReporting: {
    sentry: {
      dsn: import.meta.env.VITE_SENTRY_DSN || '',
      environment: import.meta.env.MODE,
      enabled: !!import.meta.env.VITE_SENTRY_DSN
    },
    logRocket: {
      appId: import.meta.env.VITE_LOGROCKET_APP_ID || '',
      enabled: !!import.meta.env.VITE_LOGROCKET_APP_ID
    }
  },

  // Performance Configuration
  performance: {
    // Bundle splitting thresholds
    bundleSize: {
      maxMainBundle: 250, // KB
      maxChunkSize: 150,  // KB
      maxAssetSize: 500   // KB
    },
    
    // Loading timeouts
    timeouts: {
      pageLoad: 5000,     // ms
      apiRequest: 30000,  // ms
      imageLoad: 10000    // ms
    },
    
    // Cache settings
    cache: {
      defaultTTL: 300000, // 5 minutes
      imageTTL: 3600000,  // 1 hour
      apiTTL: 60000       // 1 minute
    },
    
    // Resource hints
    preload: {
      fonts: [
        '/fonts/inter-var.woff2',
        '/fonts/manrope-var.woff2'
      ],
      images: [
        '/logo.png',
        '/hero-bg.webp'
      ],
      scripts: []
    }
  },

  // Security Configuration
  security: {
    // Content Security Policy
    csp: {
      enabled: process.env.NODE_ENV === 'production',
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https://images.unsplash.com', 'https://via.placeholder.com'],
        'connect-src': ["'self'", 'https://api.aminy.app', 'https://www.google-analytics.com']
      }
    },
    
    // Rate limiting
    rateLimiting: {
      enabled: true,
      maxRequests: 100,
      windowMs: 900000 // 15 minutes
    }
  },

  // PWA Configuration
  pwa: {
    enabled: true,
    workbox: {
      enabled: true,
      strategies: {
        pages: 'NetworkFirst',
        images: 'CacheFirst',
        api: 'NetworkFirst',
        static: 'CacheFirst'
      }
    },
    manifest: {
      name: 'Aminy - Child Development Support',
      shortName: 'Aminy',
      description: 'AI-powered guidance for parents of children with developmental needs',
      startUrl: '/',
      display: 'standalone',
      orientation: 'portrait',
      backgroundColor: '#ffffff',
      themeColor: '#0891b2',
      categories: ['health', 'education', 'lifestyle'],
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }
  },

  // Accessibility Configuration
  accessibility: {
    enabled: true,
    features: {
      skipLinks: true,
      focusManagement: true,
      screenReaderSupport: true,
      keyboardNavigation: true,
      reducedMotion: true,
      highContrast: true
    },
    testing: {
      axeCore: process.env.NODE_ENV === 'development',
      announcements: true
    }
  },

  // Internationalization
  i18n: {
    enabled: false, // Future enhancement
    defaultLocale: 'en-US',
    supportedLocales: ['en-US'],
    fallbackLocale: 'en-US'
  },

  // Development Configuration
  development: {
    enableDevTools: process.env.NODE_ENV === 'development',
    enableHotReload: process.env.NODE_ENV === 'development',
    showPerformanceMetrics: process.env.NODE_ENV === 'development',
    mockApi: process.env.NODE_ENV === 'development',
    debugLogging: process.env.NODE_ENV === 'development'
  },

  // Build Configuration
  build: {
    // Source maps
    sourceMaps: process.env.NODE_ENV === 'development',
    
    // Compression
    compression: {
      enabled: process.env.NODE_ENV === 'production',
      algorithm: 'gzip',
      level: 6
    },
    
    // Tree shaking
    treeShaking: true,
    
    // Dead code elimination
    deadCodeElimination: true,
    
    // Minification
    minify: process.env.NODE_ENV === 'production',
    
    // Asset optimization
    optimizeAssets: process.env.NODE_ENV === 'production'
  },

  // Monitoring Configuration
  monitoring: {
    // Performance monitoring
    performance: {
      enabled: true,
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
      thresholds: {
        lcp: 2500,  // ms
        fid: 100,   // ms
        cls: 0.1    // score
      }
    },
    
    // User experience monitoring
    ux: {
      enabled: true,
      trackClicks: true,
      trackScrolling: true,
      trackFormSubmissions: true,
      trackErrors: true
    },
    
    // Business metrics
    business: {
      enabled: true,
      trackConversions: true,
      trackRetention: true,
      trackEngagement: true
    }
  },

  // Deployment Configuration
  deployment: {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    buildNumber: process.env.BUILD_NUMBER || '1',
    deploymentDate: new Date().toISOString(),
    commitHash: process.env.COMMIT_HASH || '',
    
    // CDN settings
    cdn: {
      enabled: process.env.NODE_ENV === 'production',
      baseUrl: 'https://cdn.aminy.app',
      version: 'v1'
    }
  }
};

// Type-safe config access
export type ProductionConfig = typeof productionConfig;

// Config validation
export const validateConfig = (): boolean => {
  const requiredKeys = ['app.name', 'app.version'];
  
  for (const key of requiredKeys) {
    const value = key.split('.').reduce((obj, k) => obj?.[k], productionConfig as any);
    if (!value) {
      console.error(`Missing required config: ${key}`);
      return false;
    }
  }
  
  return true;
};

// Initialize configuration
export const initializeConfig = () => {
  // Set global config
  if (typeof window !== 'undefined') {
    (window as any).__AMINY_CONFIG__ = productionConfig;
  }
  
  return validateConfig();
};

// Export individual config sections
export const {
  app: appConfig,
  features: featureFlags,
  api: apiConfig,
  analytics: analyticsConfig,
  errorReporting: errorConfig,
  performance: performanceConfig,
  security: securityConfig,
  pwa: pwaConfig,
  accessibility: a11yConfig,
  development: devConfig,
  monitoring: monitoringConfig,
  deployment: deploymentConfig
} = productionConfig;

export default productionConfig;