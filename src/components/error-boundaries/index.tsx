// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Specialized Error Boundaries for Different App Sections
 *
 * Production-grade error handling with:
 * - Section-specific recovery strategies
 * - Circuit breaker integration
 * - Graceful degradation
 * - Accessibility support
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { circuits, CircuitOpenError } from '../../lib/circuit-breaker';
import { analytics } from '../../lib/analytics-engine';

// ============================================
// SHARED UTILITIES
// ============================================

interface FallbackProps {
  error?: Error;
  retry: () => void;
  errorId?: string;
}

const useKeyboardNavigation = (retry: () => void) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement?.getAttribute('role') === 'button') {
        retry();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [retry]);
};

// ============================================
// AI CHAT ERROR BOUNDARY
// ============================================

function AIChatErrorFallback({ error, retry, errorId }: FallbackProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const isCircuitOpen = error instanceof CircuitOpenError;
  const circuitStatus = circuits.ai.getStats();

  useKeyboardNavigation(retry);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    analytics.track('ai_chat_error_retry', { errorId, isCircuitOpen });

    // Wait a moment before retrying
    await new Promise(resolve => setTimeout(resolve, 500));
    retry();
    setIsRetrying(false);
  }, [retry, errorId, isCircuitOpen]);

  return (
    <div
      className="bg-amber-50 border border-amber-200 rounded-lg p-4"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-amber-800">
            {isCircuitOpen
              ? "AI assistant is taking a quick break"
              : "Couldn't connect to AI assistant"}
          </h3>
          <p className="mt-1 text-sm text-amber-700">
            {isCircuitOpen
              ? `Please try again in ${Math.ceil(circuitStatus.timeUntilRetry / 1000)} seconds.`
              : "Let me try connecting again. Your message is safe."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleRetry}
              disabled={isRetrying || isCircuitOpen}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-amber-800 bg-amber-100 rounded hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              aria-label="Retry sending message to AI assistant"
            >
              {isRetrying ? (
                <>
                  <svg className="animate-spin -ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Reconnecting...
                </>
              ) : (
                'Try Again'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AIChatErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={AIChatErrorFallback}
      isolate={true}
      critical={false}
      onError={(error) => {
        if (!(error instanceof CircuitOpenError)) {
          circuits.ai.recordFailure(error);
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// ============================================
// VIDEO CALL ERROR BOUNDARY
// ============================================

function VideoCallErrorFallback({ error, retry, errorId }: FallbackProps) {
  const [countdown, setCountdown] = useState(10);
  const isCircuitOpen = error instanceof CircuitOpenError;

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      retry();
    }
  }, [countdown, retry]);

  useKeyboardNavigation(retry);

  return (
    <div
      className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto text-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Video Connection Lost
      </h2>

      <p className="text-gray-600 mb-4">
        {isCircuitOpen
          ? "Video service is temporarily unavailable. Please try again later."
          : "We're trying to reconnect you automatically."}
      </p>

      {!isCircuitOpen && (
        <div className="mb-4">
          <div className="text-3xl font-bold text-blue-600 mb-1">{countdown}</div>
          <p className="text-sm text-gray-500">seconds until auto-reconnect</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={retry}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
        >
          Reconnect Now
        </button>

        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Refresh Page
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Error ID: {errorId}
      </p>
    </div>
  );
}

export function VideoCallErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={VideoCallErrorFallback}
      isolate={true}
      critical={true}
      onError={(error) => {
        if (!(error instanceof CircuitOpenError)) {
          circuits.video.recordFailure(error);
        }
        analytics.track('video_call_error', {
          errorMessage: error.message,
          errorName: error.name,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// ============================================
// PAYMENT ERROR BOUNDARY
// ============================================

function PaymentErrorFallback({ error, retry, errorId }: FallbackProps) {
  const isCircuitOpen = error instanceof CircuitOpenError;

  useKeyboardNavigation(retry);

  return (
    <div
      className="bg-white rounded-xl border-2 border-red-200 p-6 max-w-md mx-auto"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          Payment Processing Issue
        </h2>
      </div>

      <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
        <p className="text-sm text-red-800">
          <strong>Don't worry!</strong> Your card has not been charged.
          {isCircuitOpen
            ? " Our payment system is temporarily unavailable."
            : " We encountered a temporary issue."}
        </p>
      </div>

      <p className="text-gray-600 text-sm mb-4">
        Please try again or use a different payment method. If the problem persists,
        contact our support team.
      </p>

      <div className="flex flex-col gap-2">
        <button
          onClick={retry}
          disabled={isCircuitOpen}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Try Again
        </button>

        <a
          href="mailto:billing@aminy.ai"
          className="w-full px-4 py-2 text-center text-blue-600 hover:text-blue-700 focus:outline-none focus:underline text-sm"
        >
          Contact Billing Support
        </a>
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        Reference: {errorId}
      </p>
    </div>
  );
}

export function PaymentErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={PaymentErrorFallback}
      isolate={true}
      critical={true}
      onError={(error) => {
        if (!(error instanceof CircuitOpenError)) {
          circuits.payment.recordFailure(error);
        }
        analytics.track('payment_error', {
          errorMessage: error.message,
          errorName: error.name,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// ============================================
// FEATURE CARD ERROR BOUNDARY
// ============================================

function FeatureCardErrorFallback({ retry }: FallbackProps) {
  return (
    <div
      className="bg-gray-50 rounded-lg p-4 text-center min-h-[120px] flex flex-col items-center justify-center"
      role="alert"
    >
      <p className="text-gray-500 text-sm mb-2">Unable to load this section</p>
      <button
        onClick={retry}
        className="text-blue-600 text-sm hover:text-blue-700 focus:outline-none focus:underline"
      >
        Retry
      </button>
    </div>
  );
}

export function FeatureCardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={FeatureCardErrorFallback} isolate={true} critical={false}>
      {children}
    </ErrorBoundary>
  );
}

// ============================================
// FORM ERROR BOUNDARY
// ============================================

function FormErrorFallback({ error, retry, errorId }: FallbackProps) {
  const [formData, setFormData] = useState<string | null>(null);

  useEffect(() => {
    // Try to recover form data from localStorage
    try {
      const savedData = localStorage.getItem('lastFormData');
      if (savedData) {
        setFormData(savedData);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return (
    <div
      className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
      role="alert"
      aria-live="polite"
    >
      <div className="flex gap-3">
        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h3 className="font-medium text-yellow-800">Form submission error</h3>
          <p className="text-sm text-yellow-700 mt-1">
            {error?.message || "Something went wrong. Your data has been saved locally."}
          </p>
          {formData && (
            <p className="text-xs text-yellow-600 mt-2">
              Your previous entries are saved and will be restored.
            </p>
          )}
          <button
            onClick={retry}
            className="mt-3 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded text-sm font-medium hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

export function FormErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={FormErrorFallback} isolate={true} critical={false}>
      {children}
    </ErrorBoundary>
  );
}

// ============================================
// NAVIGATION ERROR BOUNDARY
// ============================================

function NavigationErrorFallback({ retry }: FallbackProps) {
  return (
    <nav
      className="bg-white border-b border-gray-200 px-4 py-3"
      role="navigation"
      aria-label="Main navigation (error state)"
    >
      <div className="flex items-center justify-between">
        <a href="/" className="font-semibold text-blue-600">Aminy</a>
        <button
          onClick={retry}
          className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline"
        >
          Reload Navigation
        </button>
      </div>
    </nav>
  );
}

export function NavigationErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={NavigationErrorFallback} isolate={true} critical={false}>
      {children}
    </ErrorBoundary>
  );
}

// ============================================
// DATA LOADING ERROR BOUNDARY
// ============================================

interface DataLoadingErrorProps extends FallbackProps {
  resourceName?: string;
}

function DataLoadingErrorFallback({
  error,
  retry,
  errorId,
  resourceName = 'data',
}: DataLoadingErrorProps) {
  const isNetworkError = error?.message?.toLowerCase().includes('network') ||
                         error?.message?.toLowerCase().includes('fetch');

  return (
    <div
      className="bg-gray-50 rounded-lg p-6 text-center"
      role="alert"
      aria-live="polite"
    >
      <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
        {isNetworkError ? (
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        )}
      </div>

      <h3 className="text-gray-900 font-medium mb-1">
        {isNetworkError ? "Connection issue" : `Couldn't load ${resourceName}`}
      </h3>

      <p className="text-gray-500 text-sm mb-4">
        {isNetworkError
          ? "Check your internet connection and try again."
          : "We're having trouble loading this content."}
      </p>

      <button
        onClick={retry}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium"
      >
        Retry
      </button>
    </div>
  );
}

export function DataLoadingErrorBoundary({
  children,
  resourceName,
}: {
  children: React.ReactNode;
  resourceName?: string;
}) {
  return (
    <ErrorBoundary
      fallback={(props) => <DataLoadingErrorFallback {...props} resourceName={resourceName} />}
      isolate={true}
      critical={false}
      onError={(error) => {
        circuits.database.recordFailure(error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// ============================================
// CRITICAL SECTION ERROR BOUNDARY
// ============================================

function CriticalSectionErrorFallback({ error, retry, errorId }: FallbackProps) {
  return (
    <div
      className="min-h-[50vh] flex items-center justify-center bg-gray-50 p-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Something's not quite right
        </h2>

        <p className="text-gray-600 mb-6">
          We've encountered an unexpected issue with this section.
          Our team has been automatically notified.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={retry}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
          >
            Go to Home
          </a>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Error reference: {errorId}
        </p>
      </div>
    </div>
  );
}

export function CriticalSectionErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={CriticalSectionErrorFallback}
      isolate={false}
      critical={true}
    >
      {children}
    </ErrorBoundary>
  );
}

// ============================================
// HIGHER ORDER COMPONENT
// ============================================

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    fallback?: React.ComponentType<FallbackProps>;
    isolate?: boolean;
    critical?: boolean;
    boundaryType?: 'default' | 'ai' | 'video' | 'payment' | 'form' | 'data';
  } = {}
): React.FC<P> {
  const { boundaryType = 'default', ...boundaryOptions } = options;

  const BoundaryComponent = {
    ai: AIChatErrorBoundary,
    video: VideoCallErrorBoundary,
    payment: PaymentErrorBoundary,
    form: FormErrorBoundary,
    data: DataLoadingErrorBoundary,
    default: ErrorBoundary,
  }[boundaryType];

  const WrappedComponent: React.FC<P> = (props) => (
    <BoundaryComponent {...boundaryOptions}>
      <Component {...props} />
    </BoundaryComponent>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

// Export all error boundaries
export {
  AIChatErrorFallback,
  VideoCallErrorFallback,
  PaymentErrorFallback,
  FeatureCardErrorFallback,
  FormErrorFallback,
  NavigationErrorFallback,
  DataLoadingErrorFallback,
  CriticalSectionErrorFallback,
};
