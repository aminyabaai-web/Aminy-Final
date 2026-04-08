// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ErrorDisplay - Consistent error UI component
 *
 * Provides warm, empathetic error messaging throughout the app.
 * Designed to make users feel supported, not blamed.
 */

import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  AlertCircle,
  WifiOff,
  Clock,
  Lock,
  RefreshCw,
  HelpCircle,
  ChevronRight,
  X
} from 'lucide-react';
import type { ApiError, ApiErrorType } from '../lib/api-error-handler';

interface ErrorDisplayProps {
  error?: ApiError | null;
  title?: string;
  message?: string;
  secondaryMessage?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'card' | 'fullscreen' | 'toast';
  showTechnicalDetails?: boolean;
  className?: string;
}

// Icon mapping for error types
const ERROR_ICONS: Record<ApiErrorType, React.ElementType> = {
  network: WifiOff,
  timeout: Clock,
  auth: Lock,
  'rate-limit': Clock,
  validation: AlertCircle,
  'not-found': HelpCircle,
  server: AlertCircle,
  unknown: AlertCircle
};

// Color mapping for error types
const ERROR_COLORS: Record<ApiErrorType, { bg: string; border: string; icon: string; text: string }> = {
  network: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', text: 'text-amber-900' },
  timeout: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', text: 'text-blue-900' },
  auth: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', text: 'text-purple-900' },
  'rate-limit': { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', text: 'text-orange-900' },
  validation: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', text: 'text-red-900' },
  'not-found': { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text-gray-600', text: 'text-gray-900' },
  server: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', text: 'text-red-900' },
  unknown: { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text-gray-600', text: 'text-gray-900' }
};

export function ErrorDisplay({
  error,
  title,
  message,
  secondaryMessage,
  onRetry,
  onDismiss,
  variant = 'inline',
  showTechnicalDetails = false,
  className = ''
}: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  if (!error && !message) return null;

  const errorType = error?.type || 'unknown';
  const Icon = ERROR_ICONS[errorType];
  const colors = ERROR_COLORS[errorType];

  const displayTitle = title || message || error?.message || "Something went wrong";
  const displaySecondary = secondaryMessage || (error ? getSecondaryMessage(error.type) : null);

  // Inline variant - minimal, for form fields
  if (variant === 'inline') {
    return (
      <div className={`flex items-start gap-2 p-3 rounded-lg ${colors.bg} ${colors.border} border ${className}`}>
        <Icon className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${colors.text}`}>{displayTitle}</p>
          {displaySecondary && (
            <p className="text-sm text-gray-600 mt-0.5">{displaySecondary}</p>
          )}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Card variant - for sections
  if (variant === 'card') {
    return (
      <Card className={`p-4 ${colors.bg} ${colors.border} border ${className}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-white/50`}>
            <Icon className={`w-5 h-5 ${colors.icon}`} />
          </div>
          <div className="flex-1">
            <h4 className={`font-medium ${colors.text} mb-1`}>{displayTitle}</h4>
            {displaySecondary && (
              <p className="text-sm text-gray-600">{displaySecondary}</p>
            )}

            {/* Retry button */}
            {onRetry && error?.retryable !== false && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="mt-3"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Try again
              </Button>
            )}

            {/* Technical details */}
            {showTechnicalDetails && error && (
              <div className="mt-3">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {showDetails ? 'Hide' : 'Show'} details
                </button>
                {showDetails && (
                  <div className="mt-2 p-2 bg-white/50 rounded text-xs font-mono text-gray-600">
                    {error.technicalMessage}
                    {error.code && <span className="ml-2">({error.code})</span>}
                  </div>
                )}
              </div>
            )}
          </div>
          {onDismiss && (
            <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </Card>
    );
  }

  // Fullscreen variant - for critical errors
  if (variant === 'fullscreen') {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${className}`}>
        <div className="text-center max-w-md">
          <div className={`w-16 h-16 mx-auto mb-4 sm:mb-6 ${colors.bg} rounded-full flex items-center justify-center`}>
            <Icon className={`w-8 h-8 ${colors.icon}`} />
          </div>

          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">{displayTitle}</h2>

          {displaySecondary && (
            <p className="text-gray-600 mb-4 sm:mb-6">{displaySecondary}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && error?.retryable !== false && (
              <Button
                onClick={() => {
                  if (onRetry) onRetry();
                  else window.location.reload();
                }}
                className="bg-teal-500 hover:bg-teal-600 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try again
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => window.location.replace('/')}
              className="border-gray-300"
            >
              Go to Home
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Support link */}
          <div className="mt-4 sm:mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <a href="mailto:support@aminy.ai" className="text-accent hover:underline">
                Contact support
              </a>
            </p>
          </div>

          {/* Technical details for debugging */}
          {showTechnicalDetails && error && (
            <div className="mt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {showDetails ? 'Hide' : 'Show'} technical details
              </button>
              {showDetails && (
                <div className="mt-2 p-3 bg-gray-100 rounded-lg text-left text-xs font-mono text-gray-600">
                  <p><strong>Type:</strong> {error.type}</p>
                  <p><strong>Message:</strong> {error.technicalMessage}</p>
                  {error.code && <p><strong>Code:</strong> {error.code}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Toast variant - for non-blocking notifications
  return (
    <div className={`
      fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm
      p-4 rounded-lg shadow-lg ${colors.bg} ${colors.border} border
      animate-in slide-in-from-bottom-4 duration-300
      ${className}
    `}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${colors.icon} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${colors.text}`}>{displayTitle}</p>
          {displaySecondary && (
            <p className="text-sm text-gray-600 mt-0.5">{displaySecondary}</p>
          )}
          {onRetry && error?.retryable !== false && (
            <button
              onClick={onRetry}
              className="text-sm text-accent hover:underline mt-2 inline-flex items-center"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Try again
            </button>
          )}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Helper to get secondary message by error type
function getSecondaryMessage(type: ApiErrorType): string {
  const messages: Record<ApiErrorType, string> = {
    network: "Check your internet and we'll try again together.",
    timeout: "Let's give it another try — sometimes things just need a moment.",
    auth: "Your session may have expired. No worries, it happens!",
    'rate-limit': "Take a breath — we'll be ready for you again in a moment.",
    validation: "Let's double-check the details and try again.",
    'not-found': "It may have moved or been removed. Let's go back and try something else.",
    server: "We're on it! Try again in a moment, or reach out if this keeps happening.",
    unknown: "Don't worry — this isn't your fault. Let's try again."
  };
  return messages[type];
}

/**
 * Empty state component for when there's no data
 */
interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = HelpCircle,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-gray-600 mb-4 max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
}

/**
 * Loading skeleton component
 */
interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export function LoadingSkeleton({ lines = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}

export default ErrorDisplay;
