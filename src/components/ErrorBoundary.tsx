// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { analytics } from '../lib/analytics-engine';
import { logError } from '../lib/error-logging';
import { captureError, addBreadcrumb } from '../lib/sentry';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void; errorId?: string }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolate?: boolean; // Whether this boundary should isolate errors
  critical?: boolean; // Whether errors here are critical
  level?: 'page' | 'section' | 'component'; // UI level for appropriate fallback
  resetKeys?: unknown[]; // Keys that trigger reset when changed
}

interface ErrorContext {
  url: string;
  userAgent: string;
  timestamp: number;
  userId?: string;
  userTier?: string;
  sessionId: string;
  componentStack?: string;
  buildVersion: string;
  featureFlags?: Record<string, boolean>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error,
      errorId 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.retryCount++;

    const errorContext = this.buildErrorContext(error, errorInfo);

    const componentName = errorInfo.componentStack?.split('\n')[1]?.trim() || 'Unknown';
    analytics.trackError(error, {
      errorInfo,
      errorContext,
      errorId: this.state.errorId,
      retryCount: this.retryCount,
      isCritical: this.props.critical,
      boundaryType: this.props.isolate ? 'isolated' : 'global',
    });

    logError(error, componentName, this.props.critical ? 'error' : 'warning');

    const sentryEventId = captureError(error, {
      componentName,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      retryCount: this.retryCount,
      isCritical: this.props.critical,
      boundaryType: this.props.isolate ? 'isolated' : 'global',
    });
    addBreadcrumb('error-boundary', `Caught error in ${componentName}`, {
      errorId: this.state.errorId,
      sentryEventId,
    });

    // Enhanced logging for development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error Context:', errorContext);
      console.error('Retry Count:', this.retryCount);
      console.groupEnd();
    }

    // Store error details for potential user reporting
    this.storeErrorDetails(error, errorInfo, errorContext);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Update state with error info
    this.setState({ errorInfo });
  }

  private buildErrorContext(error: Error, errorInfo: React.ErrorInfo): ErrorContext {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: analytics.exportData().session.sessionId ?? 'unknown',
      componentStack: errorInfo.componentStack || undefined,
      buildVersion: '1.0.0', // Should come from build process
      featureFlags: this.getFeatureFlags(),
    };
  }

  private getFeatureFlags(): Record<string, boolean> {
    // Extract any feature flags from localStorage or config
    try {
      const flags = localStorage.getItem('featureFlags');
      return flags ? JSON.parse(flags) : {};
    } catch {
      return {};
    }
  }

  private storeErrorDetails(error: Error, errorInfo: React.ErrorInfo, context: ErrorContext): void {
    try {
      const errorReport = {
        errorId: this.state.errorId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
        context,
        retryCount: this.retryCount,
        timestamp: Date.now(),
      };

      // Store in localStorage for potential user submission
      const existingErrors = JSON.parse(localStorage.getItem('errorReports') || '[]');
      existingErrors.push(errorReport);
      
      // Keep only last 10 errors to prevent storage overflow
      const trimmedErrors = existingErrors.slice(-10);
      localStorage.setItem('errorReports', JSON.stringify(trimmedErrors));

      // In production, this could also send to error reporting service
      // await this.sendErrorReport(errorReport);
    } catch (storageError) {
      console.error('Failed to store error details:', storageError);
    }
  }

  retry = () => {
    if (this.retryCount >= this.maxRetries) {
      return;
    }

    analytics.track('error_recovery_attempted', {
      errorId: this.state.errorId,
      retryCount: this.retryCount,
    });

    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: undefined 
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error} 
          retry={this.retry}
          errorId={this.state.errorId}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ 
  error, 
  retry, 
  errorId 
}: { 
  error?: Error; 
  retry: () => void; 
  errorId?: string; 
}) {
  const [showDetails, setShowDetails] = React.useState(false);
  const [reportSent, setReportSent] = React.useState(false);

  const sendErrorReport = async () => {
    try {
      analytics.track('error_report_submitted', {
        errorId,
        errorMessage: error?.message,
        userSubmitted: true,
      });

      if (error) {
        captureError(error, {
          errorId,
          userSubmitted: true,
          source: 'error_boundary_report_button',
        });
      }

      setReportSent(true);
    } catch (reportError) {
      console.error('Failed to send error report:', reportError);
    }
  };

  const reloadPage = () => {
    analytics.track('error_page_reload', { errorId });
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        {/* Apple-style error icon */}
        <div className="w-16 h-16 mx-auto mb-4 sm:mb-6 bg-red-50 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h2 className="text-lg sm:text-xl font-semibold text-[#132F43] mb-3">
          We hit an unexpected bump
        </h2>

        <p className="text-[#5A6B7A] mb-4 sm:mb-6 leading-relaxed">
          Don't worry — this happens sometimes and it's not your fault.
          We've been notified and are looking into it. Let's try again together.
        </p>

        {/* Error details toggle */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-700 mb-3"
          >
            {showDetails ? 'Hide' : 'Show'} technical details
          </button>
          
          {showDetails && (
            <div className="bg-[#F6FBFB] p-4 rounded-lg text-left text-sm font-mono text-[#3A4A57] max-h-32 overflow-y-auto">
              <div className="mb-2"><strong>Error:</strong> {error?.name}</div>
              <div className="mb-2"><strong>Message:</strong> {error?.message}</div>
              <div><strong>Error ID:</strong> {errorId}</div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={retry}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try again
          </button>
          
          <button
            onClick={reloadPage}
            className="bg-[#EDF4F7] text-[#3A4A57] px-6 py-3 rounded-lg hover:bg-[#E8E4DF] transition-colors font-medium"
          >
            Reload page
          </button>
        </div>

        {/* Error reporting */}
        <div className="mt-4 sm:mt-6 pt-6 border-t border-[#E8E4DF]">
          {!reportSent ? (
            <button
              onClick={sendErrorReport}
              className="text-sm text-[#5A6B7A] hover:text-[#3A4A57]"
            >
              Send error report to help us improve
            </button>
          ) : (
            <p className="text-sm text-green-600">✓ Error report sent. Thank you!</p>
          )}
        </div>

        {/* Support link */}
        <div className="mt-4">
          <p className="text-sm text-[#8A9BA8]">
            If this problem persists, please{' '}
            <a 
              href="mailto:support@aminy.ai" 
              className="text-blue-600 hover:text-blue-700"
            >
              contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Level-specific Fallback Components
// ============================================================================

function SectionErrorFallback({
  error,
  retry,
  errorId,
}: {
  error?: Error;
  retry: () => void;
  errorId?: string;
}) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-1">
            This section couldn't load
          </h3>
          <p className="text-red-700 dark:text-red-300 text-sm mb-4">
            There was a problem loading this content. You can try again or continue using other parts of the app.
          </p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

function ComponentErrorFallback({
  retry,
}: {
  error?: Error;
  retry: () => void;
  errorId?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-sm text-red-700 dark:text-red-300">Failed to load</span>
      <button
        onClick={retry}
        className="text-sm text-red-600 hover:underline font-medium"
      >
        Retry
      </button>
    </div>
  );
}

// Get fallback based on level
export function getFallbackForLevel(level?: 'page' | 'section' | 'component') {
  switch (level) {
    case 'section':
      return SectionErrorFallback;
    case 'component':
      return ComponentErrorFallback;
    case 'page':
    default:
      return DefaultErrorFallback;
  }
}

// ============================================================================
// HOC for wrapping components with error boundary
// ============================================================================

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<ErrorBoundaryProps, 'children'> = {}
) {
  const WithErrorBoundary = (props: P) => (
    <ErrorBoundary {...options}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundary;
}

// ============================================================================
// Hook for imperative error throwing (useful in event handlers)
// ============================================================================

export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  if (error) {
    throw error;
  }

  const throwError = React.useCallback((err: Error) => {
    setError(err);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return { throwError, resetError };
}

// ============================================================================
// Async Boundary combining ErrorBoundary with Suspense
// ============================================================================

interface AsyncBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void; errorId?: string }>;
  loadingFallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
}

export function AsyncBoundary({
  children,
  fallback,
  loadingFallback,
  onError,
  level = 'section',
}: AsyncBoundaryProps) {
  return (
    <ErrorBoundary fallback={fallback || getFallbackForLevel(level)} onError={onError} level={level}>
      <React.Suspense fallback={loadingFallback || <DefaultLoadingFallback />}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

function DefaultLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 border-4 border-[#2A7D99]/20 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

export default ErrorBoundary;
