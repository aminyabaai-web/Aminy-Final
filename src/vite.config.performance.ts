import { defineConfig } from 'vite';

/**
 * PERFORMANCE-OPTIMIZED VITE CONFIG
 * Target: FCP < 2500ms, CLS < 0.25ms
 */
export default defineConfig({
  build: {
    // Code splitting strategy
    rollupOptions: {
      output: {
        manualChunks: {
          // Critical vendor chunk - loaded first
          'vendor-critical': [
            'react',
            'react-dom'
          ],
          // UI components - loaded second
          'vendor-ui': [
            'lucide-react',
            '@radix-ui/react-dialog',
            '@radix-ui/react-select'
          ],
          // Non-critical vendors - lazy loaded
          'vendor-utils': [
            'sonner'
          ]
        },
        // Optimize chunk names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/[name]-[hash].js`;
        },
        // Ensure consistent hashing
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Optimize CSS code splitting
    cssCodeSplit: true,
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2
      },
      format: {
        comments: false
      }
    },
    // Enable source maps for debugging (disable in production)
    sourcemap: false,
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 500
  },
  
  // Server configuration for dev
  server: {
    // Enable HTTP/2
    https: false,
    // Optimize HMR
    hmr: {
      overlay: true
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom'
    ],
    exclude: [
      // Exclude large dependencies that should be lazy loaded
      '@radix-ui/react-dialog',
      'recharts'
    ]
  },
  
  // Performance hints
  esbuild: {
    // Faster builds
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    // Tree shaking
    treeShaking: true,
    // Minify identifiers
    minifyIdentifiers: true,
    // Remove whitespace
    minifyWhitespace: true,
    // Minify syntax
    minifySyntax: true
  }
});
