import React, { useState, useEffect, ReactNode } from 'react';
import { Loader2, Heart, Zap } from 'lucide-react';
import { CompassIcon } from './CompassIcon';

interface LoadingStateProps {
  isLoading: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  delay?: number;
  timeout?: number;
  variant?: 'minimal' | 'branded' | 'skeleton';
  message?: string;
  onTimeout?: () => void;
}

/**
 * LoadingStateManager - Prevents white screens with graceful loading states
 * Includes timeout handling and branded loading experiences
 */
export const LoadingStateManager: React.FC<LoadingStateProps> = ({
  isLoading,
  children,
  fallback,
  delay = 200,
  timeout = 15000,
  variant = 'branded',
  message,
  onTimeout,
}) => {
  const [showLoading, setShowLoading] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    let delayTimer: NodeJS.Timeout;
    let timeoutTimer: NodeJS.Timeout;

    if (isLoading) {
      // Show loading after delay
      delayTimer = setTimeout(() => {
        setShowLoading(true);
      }, delay);

      // Handle timeout
      timeoutTimer = setTimeout(() => {
        setHasTimedOut(true);
        if (onTimeout) {
          onTimeout();
        }
      }, timeout);
    } else {
      setShowLoading(false);
      setHasTimedOut(false);
    }

    return () => {
      clearTimeout(delayTimer);
      clearTimeout(timeoutTimer);
    };
  }, [isLoading, delay, timeout, onTimeout]);

  // Show children immediately if not loading
  if (!isLoading) {
    return <>{children}</>;
  }

  // Show nothing during delay period
  if (!showLoading) {
    return null;
  }

  // Handle timeout
  if (hasTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CompassIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Taking longer than expected
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please check your connection and try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Use custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Render appropriate variant
  switch (variant) {
    case 'minimal':
      return <MinimalLoader message={message} />;
    case 'skeleton':
      return <SkeletonLoader />;
    case 'branded':
    default:
      return <BrandedLoader message={message} />;
  }
};

/**
 * Minimal loading spinner
 */
const MinimalLoader: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  </div>
);

/**
 * Branded loading experience matching Aminy's design
 */
const BrandedLoader: React.FC<{ message?: string }> = ({ message }) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-background">
    <div className="text-center max-w-sm">
      {/* Animated Logo */}
      <div className="relative mb-8">
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <CompassIcon className="w-10 h-10 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        
        {/* Floating elements */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent/20 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}>
          <Heart className="w-3 h-3 text-accent m-1.5" />
        </div>
        <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-yellow-400/20 rounded-full animate-bounce" style={{ animationDelay: '1s' }}>
          <Zap className="w-3 h-3 text-yellow-600 m-1.5" />
        </div>
      </div>

      {/* Loading message */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {message || 'Loading your personalized experience...'}
        </h3>
        <p className="text-sm text-muted-foreground">
          Just a moment while we prepare everything for you
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1 mt-4 sm:mt-6">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  </div>
);

/**
 * Skeleton loading for dashboard-like layouts
 */
const SkeletonLoader: React.FC = () => (
  <div className="min-h-screen bg-background p-4">
    <div className="max-w-7xl mx-auto">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-muted rounded-lg w-48 mb-2 animate-pulse"></div>
        <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 sm:gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-muted rounded-lg animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-3 bg-muted rounded w-16 animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded animate-pulse"></div>
              <div className="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="h-6 bg-muted rounded w-32 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-5/6 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-4/6 animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Hook for managing async loading states
 */
export const useLoadingState = (initialLoading = false) => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [error, setError] = useState<Error | null>(null);

  const withLoading = async <T,>(
    asyncFn: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      finally?: () => void;
    }
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await asyncFn();
      
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      if (options?.onError) {
        options.onError(error);
      }
      
      return null;
    } finally {
      setIsLoading(false);
      if (options?.finally) {
        options.finally();
      }
    }
  };

  return {
    isLoading,
    error,
    setIsLoading,
    setError,
    withLoading,
  };
};

export default LoadingStateManager;