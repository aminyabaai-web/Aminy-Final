import React from 'react';
import { analytics } from '../lib/analytics-engine';
import { logError } from '../lib/error-logging';

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

    // Track error in analytics
    analytics.trackError(error, {
      errorInfo,
      errorContext,
      errorId: this.state.errorId,
      retryCount: this.retryCount,
      isCritical: this.props.critical,
      boundaryType: this.props.isolate ? 'isolated' : 'global',
    });

    // Log error to Supabase for tracking
    logError({
      message: error.message,
      stack: error.stack,
      componentName: errorInfo.componentStack?.split('\n')[1]?.trim() || 'Unknown',
      severity: this.props.critical ? 'error' : 'warning',
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
      sessionId: analytics.exportData().session.sessionId || 'unknown',
      componentStack: errorInfo.componentStack,
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

      // In production, send to error reporting service
      // await fetch('/api/error-report', {
      //   method: 'POST',
      //   body: JSON.stringify({ errorId, userFeedback: 'User submitted error report' })
      // });

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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        {/* Apple-style error icon */}
        <div className="w-16 h-16 mx-auto mb-4 sm:mb-6 bg-red-50 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
          We hit an unexpected bump
        </h2>

        <p className="text-gray-600 mb-4 sm:mb-6 leading-relaxed">
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
            <div className="bg-gray-50 p-4 rounded-lg text-left text-sm font-mono text-gray-700 max-h-32 overflow-y-auto">
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
            className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Reload page
          </button>
        </div>

        {/* Error reporting */}
        <div className="mt-4 sm:mt-6 pt-6 border-t border-gray-200">
          {!reportSent ? (
            <button
              onClick={sendErrorReport}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Send error report to help us improve
            </button>
          ) : (
            <p className="text-sm text-green-600">✓ Error report sent. Thank you!</p>
          )}
        </div>

        {/* Support link */}
        <div className="mt-4">
          <p className="text-xs text-gray-400">
            If this problem persists, please{' '}
            <a 
              href="mailto:support@aminy.com" 
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

export default ErrorBoundary;