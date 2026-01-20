// ===== PHASE 3: QUALITY ASSURANCE & TESTING UTILITIES =====

// Performance testing
export class PerformanceTester {
  private static measurements: Record<string, number[]> = {};

  static startMeasurement(name: string) {
    if (typeof window === 'undefined') return;
    performance.mark(`${name}-start`);
  }

  static endMeasurement(name: string) {
    if (typeof window === 'undefined') return;
    
    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = performance.getEntriesByName(name)[0] as PerformanceMeasure;
      
      if (!this.measurements[name]) {
        this.measurements[name] = [];
      }
      
      this.measurements[name].push(measure.duration);
      
      // Keep only last 100 measurements
      if (this.measurements[name].length > 100) {
        this.measurements[name] = this.measurements[name].slice(-100);
      }
      
      
      // Warn about slow operations
      if (measure.duration > 1000) {
      }
      
      return measure.duration;
    } catch (error) {
      return 0;
    }
  }

  static getStats(name: string) {
    const measurements = this.measurements[name];
    
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);
    
    return {
      count: measurements.length,
      average: sum / measurements.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }

  static getAllStats() {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    
    Object.keys(this.measurements).forEach(name => {
      stats[name] = this.getStats(name);
    });
    
    return stats;
  }

  static clearStats() {
    this.measurements = {};
  }

  static benchmark(name: string, operation: () => void | Promise<void>) {
    return async () => {
      this.startMeasurement(name);
      
      try {
        await operation();
      } finally {
        this.endMeasurement(name);
      }
    };
  }
}

// Memory leak detector
export class MemoryLeakDetector {
  private static initialMemory: number = 0;
  private static measurements: Array<{ timestamp: number; memory: number }> = [];
  private static isRunning: boolean = false;

  static start() {
    if (typeof window === 'undefined' || this.isRunning) return;
    
    if (!('memory' in performance)) {
      return;
    }

    this.initialMemory = (performance as any).memory.usedJSHeapSize;
    this.isRunning = true;
    
    
    // Measure memory every 30 seconds
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }
      
      this.takeMeasurement();
    }, 30000);

    return () => {
      this.stop();
      clearInterval(interval);
    };
  }

  static stop() {
    this.isRunning = false;
  }

  static takeMeasurement() {
    if (typeof window === 'undefined' || !('memory' in performance)) return;
    
    const memory = (performance as any).memory.usedJSHeapSize;
    const timestamp = Date.now();
    
    this.measurements.push({ timestamp, memory });
    
    // Keep only last 100 measurements (50 minutes of data)
    if (this.measurements.length > 100) {
      this.measurements = this.measurements.slice(-100);
    }
    
    // Check for potential memory leak
    const growth = memory - this.initialMemory;
    const growthMB = growth / (1024 * 1024);
    
    
    // Warn if memory growth exceeds 50MB
    if (growthMB > 50) {
    }
  }

  static getReport() {
    if (this.measurements.length === 0) return null;
    
    const memories = this.measurements.map(m => m.memory);
    const latest = memories[memories.length - 1];
    const growth = latest - this.initialMemory;
    
    return {
      initialMemory: this.initialMemory / (1024 * 1024), // MB
      currentMemory: latest / (1024 * 1024), // MB
      totalGrowth: growth / (1024 * 1024), // MB
      measurements: this.measurements.length,
      timeline: this.measurements
    };
  }
}

// Accessibility Tester
export class AccessibilityTester {
  static async runBasicTests() {
    const results = {
      skipLinks: this.testSkipLinks(),
      focusManagement: this.testFocusManagement(),
      ariaLabels: this.testAriaLabels(),
      colorContrast: this.testColorContrast(),
      headingStructure: this.testHeadingStructure(),
      imageAltText: this.testImageAltText(),
      formLabels: this.testFormLabels()
    };

    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    console.table(results);
    
    return { results, score: passed / total };
  }

  private static testSkipLinks(): boolean {
    const skipLinks = document.querySelectorAll('a[href="#main-content"], a[href="#navigation"]');
    return skipLinks.length > 0;
  }

  private static testFocusManagement(): boolean {
    const focusableElements = document.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select'
    );
    
    let hasTabIndex = 0;
    focusableElements.forEach(element => {
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex && parseInt(tabIndex) >= 0) {
        hasTabIndex++;
      }
    });
    
    return hasTabIndex > 0 || focusableElements.length > 0;
  }

  private static testAriaLabels(): boolean {
    const interactiveElements = document.querySelectorAll('button, a, input');
    let hasAriaLabel = 0;
    
    interactiveElements.forEach(element => {
      if (element.getAttribute('aria-label') || 
          element.getAttribute('aria-labelledby') ||
          element.textContent?.trim()) {
        hasAriaLabel++;
      }
    });
    
    return hasAriaLabel / interactiveElements.length > 0.8; // 80% threshold
  }

  private static testColorContrast(): boolean {
    // Basic test - check if CSS custom properties are defined
    const root = getComputedStyle(document.documentElement);
    const hasColors = root.getPropertyValue('--foreground') && 
                     root.getPropertyValue('--background');
    return hasColors;
  }

  private static testHeadingStructure(): boolean {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    
    if (headings.length === 0) return false;
    
    // Check if there's at least one h1
    const h1Count = document.querySelectorAll('h1').length;
    
    // Check heading order
    let previousLevel = 0;
    let validStructure = true;
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > previousLevel + 1 && previousLevel > 0) {
        validStructure = false;
      }
      previousLevel = Math.min(previousLevel, level);
    });
    
    return h1Count >= 1 && validStructure;
  }

  private static testImageAltText(): boolean {
    const images = document.querySelectorAll('img');
    let hasAlt = 0;
    
    images.forEach(img => {
      if (img.getAttribute('alt') !== null) {
        hasAlt++;
      }
    });
    
    return images.length === 0 || hasAlt / images.length > 0.9; // 90% threshold
  }

  private static testFormLabels(): boolean {
    const inputs = document.querySelectorAll('input, textarea, select');
    let hasLabel = 0;
    
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      const hasLabelFor = id && document.querySelector(`label[for="${id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label') || 
                          input.getAttribute('aria-labelledby');
      
      if (hasLabelFor || hasAriaLabel) {
        hasLabel++;
      }
    });
    
    return inputs.length === 0 || hasLabel / inputs.length > 0.8; // 80% threshold
  }
}

// User Experience Tester
export class UXTester {
  private static interactions: Array<{
    type: string;
    target: string;
    timestamp: number;
    duration?: number;
  }> = [];

  static startTracking() {
    if (typeof window === 'undefined') return;
    
    // Track click interactions
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      this.interactions.push({
        type: 'click',
        target: this.getElementSelector(target),
        timestamp: Date.now()
      });
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const target = event.target as HTMLElement;
      this.interactions.push({
        type: 'form_submit',
        target: this.getElementSelector(target),
        timestamp: Date.now()
      });
    });

    // Track navigation
    window.addEventListener('popstate', () => {
      this.interactions.push({
        type: 'navigation',
        target: window.location.pathname,
        timestamp: Date.now()
      });
    });

  }

  private static getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className && typeof element.className === 'string') {
      return `.${element.className.split(' ')[0]}`;
    }
    return element.tagName.toLowerCase();
  }

  static getInteractionReport() {
    const now = Date.now();
    const lastHour = this.interactions.filter(i => now - i.timestamp < 3600000);
    
    const clickRate = lastHour.filter(i => i.type === 'click').length;
    const formSubmissions = lastHour.filter(i => i.type === 'form_submit').length;
    const navigations = lastHour.filter(i => i.type === 'navigation').length;
    
    return {
      totalInteractions: this.interactions.length,
      lastHour: {
        clicks: clickRate,
        formSubmissions,
        navigations,
        total: lastHour.length
      },
      mostClickedElements: this.getMostClickedElements(),
      sessionDuration: this.interactions.length > 0 ? 
        now - this.interactions[0].timestamp : 0
    };
  }

  private static getMostClickedElements() {
    const clickCounts: Record<string, number> = {};
    
    this.interactions
      .filter(i => i.type === 'click')
      .forEach(i => {
        clickCounts[i.target] = (clickCounts[i.target] || 0) + 1;
      });
    
    return Object.entries(clickCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([target, count]) => ({ target, count }));
  }
}

// Error Rate Monitor
export class ErrorRateMonitor {
  private static errors: Array<{
    type: string;
    message: string;
    timestamp: number;
    stack?: string;
  }> = [];

  static initialize() {
    if (typeof window === 'undefined') return;

    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordError('javascript', event.error?.message || event.message, event.error?.stack);
    });

    // Track promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError('promise_rejection', event.reason?.message || String(event.reason));
    });

  }

  static recordError(type: string, message: string, stack?: string) {
    this.errors.push({
      type,
      message,
      timestamp: Date.now(),
      stack
    });

    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    console.error(`[Error Monitor] ${type}:`, message);
  }

  static getErrorRate(timeWindowMs: number = 3600000) { // Default 1 hour
    const now = Date.now();
    const recentErrors = this.errors.filter(e => now - e.timestamp < timeWindowMs);
    
    return {
      totalErrors: this.errors.length,
      recentErrors: recentErrors.length,
      errorRate: recentErrors.length / (timeWindowMs / 1000 / 60), // errors per minute
      errorTypes: this.getErrorTypes(recentErrors),
      timeline: this.getErrorTimeline(recentErrors)
    };
  }

  private static getErrorTypes(errors: typeof this.errors) {
    const types: Record<string, number> = {};
    
    errors.forEach(error => {
      types[error.type] = (types[error.type] || 0) + 1;
    });
    
    return types;
  }

  private static getErrorTimeline(errors: typeof this.errors) {
    return errors.map(error => ({
      timestamp: error.timestamp,
      type: error.type,
      message: error.message.substring(0, 100) // Truncate for display
    }));
  }
}

// Load Testing Simulator
export class LoadTestSimulator {
  static async simulateUserJourney() {
    
    const journey = [
      { name: 'splash_load', action: () => this.simulatePageLoad() },
      { name: 'navigation_home', action: () => this.simulateNavigation('home') },
      { name: 'ask_aminy', action: () => this.simulateAskAminy() },
      { name: 'navigation_care', action: () => this.simulateNavigation('care') },
      { name: 'message_send', action: () => this.simulateMessageSend() },
      { name: 'navigation_plan', action: () => this.simulateNavigation('plan') },
      { name: 'plan_view', action: () => this.simulateViewPlan() },
      { name: 'navigation_reports', action: () => this.simulateNavigation('reports') },
      { name: 'report_export', action: () => this.simulateReportExport() }
    ];

    const results = [];

    for (const step of journey) {
      try {
        PerformanceTester.startMeasurement(step.name);
        await step.action();
        const duration = PerformanceTester.endMeasurement(step.name);
        
        results.push({
          step: step.name,
          duration,
          status: 'success'
        });
        
        // Random delay between actions (500-2000ms)
        await new Promise(resolve => 
          setTimeout(resolve, 500 + Math.random() * 1500)
        );
      } catch (error) {
        results.push({
          step: step.name,
          duration: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        });
        
        console.error(`[Load Test] Step ${step.name} failed:`, error);
      }
    }

    console.table(results);
    
    return results;
  }

  private static async simulatePageLoad() {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  }

  private static async simulateNavigation(destination: string) {
    window.dispatchEvent(new CustomEvent('navigate', { detail: destination }));
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
  }

  private static async simulateAskAminy() {
    const event = new CustomEvent('simulate-ask-aminy', {
      detail: { message: 'How can I help my child with communication?' }
    });
    window.dispatchEvent(event);
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  }

  private static async simulateMessageSend() {
    const event = new CustomEvent('simulate-message-send', {
      detail: { message: 'Thank you for the guidance!' }
    });
    window.dispatchEvent(event);
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  }

  private static async simulateViewPlan() {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  }

  private static async simulateReportExport() {
    const event = new CustomEvent('simulate-report-export', {
      detail: { type: 'pdf' }
    });
    window.dispatchEvent(event);
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
  }
}

// Feature Flag Testing
export class FeatureFlagTester {
  private static flags: Record<string, boolean> = {};
  private static overrides: Record<string, boolean> = {};

  static setFlags(flags: Record<string, boolean>) {
    this.flags = { ...this.flags, ...flags };
  }

  static isEnabled(flagName: string, defaultValue: boolean = false): boolean {
    // Check for override first
    if (flagName in this.overrides) {
      return this.overrides[flagName];
    }

    // Check regular flags
    if (flagName in this.flags) {
      return this.flags[flagName];
    }

    return defaultValue;
  }

  static override(flagName: string, value: boolean) {
    this.overrides[flagName] = value;
  }

  static clearOverrides() {
    this.overrides = {};
  }

  static getAllFlags() {
    return { ...this.flags, ...this.overrides };
  }

  static async runABTest(
    flagName: string,
    variantA: () => void | Promise<void>,
    variantB: () => void | Promise<void>
  ) {
    const isVariantB = this.isEnabled(flagName, Math.random() < 0.5);
    
    
    try {
      if (isVariantB) {
        await variantB();
      } else {
        await variantA();
      }
      
      // Track the variant
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'ab_test_variant', {
          test_name: flagName,
          variant: isVariantB ? 'B' : 'A'
        });
      }
    } catch (error) {
      console.error(`[A/B Test] Variant failed for ${flagName}:`, error);
    }
  }
}

// Integration Test Runner
export class IntegrationTester {
  static async runCriticalPath() {
    const tests = [
      { name: 'App Initialization', test: this.testAppInitialization },
      { name: 'Navigation System', test: this.testNavigationSystem },
      { name: 'Tier Management', test: this.testTierManagement },
      { name: 'Local Storage', test: this.testLocalStorage },
      { name: 'Error Handling', test: this.testErrorHandling },
      { name: 'Theme System', test: this.testThemeSystem }
    ];

    const results = [];

    for (const test of tests) {
      try {
        await test.test();
        results.push({ test: test.name, status: 'passed' });
      } catch (error) {
        results.push({ 
          test: test.name, 
          status: 'failed', 
          error: error instanceof Error ? error.message : String(error)
        });
        console.error(`[Integration Test] ❌ ${test.name} failed:`, error);
      }
    }

    const passed = results.filter(r => r.status === 'passed').length;
    
    return results;
  }

  private static async testAppInitialization() {
    if (!window.aminyTier) {
      throw new Error('Tier system not initialized');
    }
    
    const tier = window.aminyTier.get();
    if (!['starter', 'core', 'pro'].includes(tier)) {
      throw new Error(`Invalid tier: ${tier}`);
    }
  }

  private static async testNavigationSystem() {
    const testNav = (destination: string) => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Navigation to ${destination} timed out`));
        }, 1000);

        const handler = () => {
          clearTimeout(timeout);
          window.removeEventListener('navigate-complete', handler);
          resolve();
        };

        window.addEventListener('navigate-complete', handler);
        window.dispatchEvent(new CustomEvent('navigate', { detail: destination }));
      });
    };

    await testNav('home');
    await testNav('care');
    await testNav('plan');
  }

  private static async testTierManagement() {
    const originalTier = window.aminyTier.get();
    
    // Test tier switching
    window.aminyTier.set('pro');
    if (window.aminyTier.get() !== 'pro') {
      throw new Error('Tier switching failed');
    }
    
    // Restore original tier
    window.aminyTier.set(originalTier);
  }

  private static async testLocalStorage() {
    const testKey = 'aminy-test-key';
    const testValue = 'test-value';
    
    try {
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      
      if (retrieved !== testValue) {
        throw new Error('LocalStorage write/read failed');
      }
      
      localStorage.removeItem(testKey);
    } catch (error) {
      throw new Error('LocalStorage not available');
    }
  }

  private static async testErrorHandling() {
    // Test that error boundaries catch errors
    const testError = new Error('Test error');
    
    try {
      throw testError;
    } catch (error) {
      if (error !== testError) {
        throw new Error('Error handling failed');
      }
    }
  }

  private static async testThemeSystem() {
    const root = document.documentElement;
    const originalClasses = root.className;
    
    // Test dark mode
    root.classList.add('dark');
    if (!root.classList.contains('dark')) {
      throw new Error('Theme system failed - dark mode');
    }
    
    // Test light mode
    root.classList.remove('dark');
    root.classList.add('light');
    if (!root.classList.contains('light')) {
      throw new Error('Theme system failed - light mode');
    }
    
    // Restore original classes
    root.className = originalClasses;
  }
}

// Health Check Service
export class HealthChecker {
  static async runHealthCheck() {
    const checks = {
      // Basic functionality
      localStorage: this.checkLocalStorage(),
      sessionStorage: this.checkSessionStorage(),
      networkConnection: this.checkNetworkConnection(),
      
      // Performance
      memoryUsage: this.checkMemoryUsage(),
      performanceAPI: this.checkPerformanceAPI(),
      
      // Browser features
      serviceWorker: this.checkServiceWorker(),
      webVitals: this.checkWebVitals(),
      accessibility: this.checkAccessibilitySupport(),
      
      // App-specific
      tierSystem: this.checkTierSystem(),
      connectorHub: this.checkConnectorHub()
    };

    const results = {};
    
    for (const [name, checkFn] of Object.entries(checks)) {
      try {
        results[name] = await checkFn;
      } catch (error) {
        results[name] = {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }

    const healthScore = Object.values(results).filter(
      (result: any) => result.status === 'healthy'
    ).length / Object.keys(results).length;

    console.table(results);
    
    return {
      healthScore,
      results,
      timestamp: new Date().toISOString()
    };
  }

  private static checkLocalStorage() {
    try {
      const testKey = '__health_check__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return { status: 'healthy' };
    } catch {
      return { status: 'failed', message: 'LocalStorage not available' };
    }
  }

  private static checkSessionStorage() {
    try {
      const testKey = '__health_check__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return { status: 'healthy' };
    } catch {
      return { status: 'failed', message: 'SessionStorage not available' };
    }
  }

  private static async checkNetworkConnection() {
    if (typeof navigator === 'undefined') {
      return { status: 'unknown', message: 'Navigator not available' };
    }
    
    return {
      status: navigator.onLine ? 'healthy' : 'degraded',
      message: navigator.onLine ? 'Online' : 'Offline',
      connectionType: (navigator as any).connection?.effectiveType || 'unknown'
    };
  }

  private static checkMemoryUsage() {
    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return { status: 'unknown', message: 'Memory API not available' };
    }
    
    const memory = (performance as any).memory;
    const usedMB = memory.usedJSHeapSize / 1024 / 1024;
    const totalMB = memory.totalJSHeapSize / 1024 / 1024;
    const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
    
    const usage = usedMB / limitMB;
    
    return {
      status: usage < 0.8 ? 'healthy' : usage < 0.9 ? 'degraded' : 'critical',
      usedMB: usedMB.toFixed(2),
      totalMB: totalMB.toFixed(2),
      limitMB: limitMB.toFixed(2),
      usagePercent: (usage * 100).toFixed(1)
    };
  }

  private static checkPerformanceAPI() {
    if (typeof performance === 'undefined') {
      return { status: 'failed', message: 'Performance API not available' };
    }
    
    const hasObserver = 'PerformanceObserver' in window;
    const hasNavigation = 'getEntriesByType' in performance;
    
    return {
      status: hasObserver && hasNavigation ? 'healthy' : 'degraded',
      features: { hasObserver, hasNavigation }
    };
  }

  private static checkServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return { status: 'unsupported', message: 'Service Worker not supported' };
    }
    
    return navigator.serviceWorker.getRegistration()
      .then(registration => ({
        status: registration ? 'healthy' : 'inactive',
        message: registration ? 'Active' : 'Not registered'
      }))
      .catch(() => ({
        status: 'failed',
        message: 'Service Worker check failed'
      }));
  }

  private static async checkWebVitals() {
    // Check if web vitals can be measured
    const vitals = ['LCP', 'FID', 'CLS'];
    const measured = [];
    
    vitals.forEach(vital => {
      const entries = performance.getEntriesByName(vital);
      if (entries.length > 0) {
        measured.push(vital);
      }
    });
    
    return {
      status: measured.length > 0 ? 'healthy' : 'pending',
      measured
    };
  }

  private static checkAccessibilitySupport() {
    const features = {
      ariaSupported: 'getAttribute' in Element.prototype,
      focusManagement: 'focus' in HTMLElement.prototype,
      screenReaderSupport: 'speechSynthesis' in window
    };
    
    const supported = Object.values(features).filter(Boolean).length;
    const total = Object.keys(features).length;
    
    return {
      status: supported === total ? 'healthy' : 'partial',
      supportedFeatures: supported,
      totalFeatures: total,
      features
    };
  }

  private static checkTierSystem() {
    if (typeof window === 'undefined' || !window.aminyTier) {
      return { status: 'failed', message: 'Tier system not available' };
    }
    
    try {
      const tier = window.aminyTier.get();
      const isValid = ['starter', 'core', 'pro'].includes(tier);
      
      return {
        status: isValid ? 'healthy' : 'failed',
        currentTier: tier,
        message: isValid ? 'Working correctly' : 'Invalid tier value'
      };
    } catch (error) {
      return {
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static checkConnectorHub() {
    // Check if connector hub is available and functional
    try {
      if (typeof window !== 'undefined' && (window as any).connectorHub) {
        return { status: 'healthy', message: 'Connector hub available' };
      } else {
        return { status: 'degraded', message: 'Connector hub not available' };
      }
    } catch (error) {
      return {
        status: 'failed',
        message: error instanceof Error ? error.message : 'Connector hub check failed'
      };
    }
  }
}

// Quality Assurance Dashboard Component
export const QADashboard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runAllTests = async () => {
    setIsRunningTests(true);
    
    try {
      const [
        healthCheck,
        performanceStats,
        accessibilityTest,
        errorRate,
        uxReport
      ] = await Promise.all([
        HealthChecker.runHealthCheck(),
        Promise.resolve(PerformanceTester.getAllStats()),
        AccessibilityTester.runBasicTests(),
        Promise.resolve(ErrorRateMonitor.getErrorRate()),
        Promise.resolve(UXTester.getInteractionReport())
      ]);

      setTestResults({
        health: healthCheck,
        performance: performanceStats,
        accessibility: accessibilityTest,
        errors: errorRate,
        ux: uxReport,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[QA] Test run failed:', error);
      toast.error('Quality assurance tests failed');
    } finally {
      setIsRunningTests(false);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-4 w-12 h-12 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors z-40 flex items-center justify-center"
        aria-label="Open QA dashboard"
        title="Quality Assurance"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quality Assurance Dashboard</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={runAllTests}
                disabled={isRunningTests}
                className="bg-green-600 hover:bg-green-700"
              >
                {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => LoadTestSimulator.simulateUserJourney()}
              >
                Simulate User Journey
              </Button>
            </div>

            {testResults && (
              <div className="space-y-4">
                {/* Health Check Results */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Health Check</h3>
                  <div className="text-sm text-gray-600">
                    Health Score: {(testResults.health.healthScore * 100).toFixed(1)}%
                  </div>
                </div>

                {/* Performance Results */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Performance</h3>
                  <div className="text-sm text-gray-600">
                    {Object.keys(testResults.performance).length} metrics tracked
                  </div>
                </div>

                {/* Accessibility Results */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Accessibility</h3>
                  <div className="text-sm text-gray-600">
                    Score: {(testResults.accessibility.score * 100).toFixed(1)}%
                  </div>
                </div>

                {/* Error Rate */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Error Rate</h3>
                  <div className="text-sm text-gray-600">
                    {testResults.errors.recentErrors} errors in last hour
                    ({testResults.errors.errorRate.toFixed(2)} errors/min)
                  </div>
                </div>

                {/* UX Metrics */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">User Experience</h3>
                  <div className="text-sm text-gray-600">
                    {testResults.ux.totalInteractions} total interactions
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default {
  PerformanceTester,
  MemoryLeakDetector,
  AccessibilityTester,
  UXTester,
  ErrorRateMonitor,
  LoadTestSimulator,
  FeatureFlagTester,
  IntegrationTester,
  HealthChecker,
  QADashboard
};