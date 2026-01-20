// Performance Configuration for Aminy App
// This file helps optimize React rendering and prevent timeout issues

export const performanceConfig = {
  // Debounce timing for various operations
  debounce: {
    resize: 16, // ~60fps
    input: 100,
    search: 300,
    scroll: 16,
    mutation: 16
  },
  
  // Batch size limits for data processing
  batchSizes: {
    seedData: 50,
    eventProcessing: 10,
    domQueries: 5
  },
  
  // Timeout limits
  timeouts: {
    seedDataLoad: 5000,
    componentMount: 3000,
    eventListener: 1000
  },
  
  // Feature flags for performance optimization
  features: {
    lazyLoadSeedData: true,
    debounceStateUpdates: true,
    batchDomUpdates: true,
    usePassiveListeners: true,
    optimizeAnimations: true
  }
};

// Utility function to create debounced functions
export function createDebounced(fn, delay = 100) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Utility function to batch DOM updates
export function batchDomUpdates(fn) {
  return function batched(...args) {
    requestAnimationFrame(() => {
      try {
        fn.apply(this, args);
      } catch (error) {
        console.warn('Batched DOM update error:', error);
      }
    });
  };
}

// Utility function for safe async operations
export function createSafeAsync(fn, timeout = 5000) {
  return function safeAsync(...args) {
    return Promise.race([
      fn.apply(this, args),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      )
    ]).catch(error => {
      console.warn('Safe async operation failed:', error);
      return null;
    });
  };
}

export default performanceConfig;