import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCw, Home, MessageCircle, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

// ===== PHASE 3: UNIVERSAL ERROR HANDLING & LOADING STATES =====

// Error types
interface AppError {
  id: string;
  type: 'network' | 'validation' | 'permission' | 'server' | 'unknown';
  message: string;
  details?: string;
  timestamp: Date;
  recoverable: boolean;
  userAction?: string;
  context?: Record<string, any>;
}

// Error Context
interface ErrorContextType {
  errors: AppError[];
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  hasError: (type?: AppError['type']) => boolean;
}

const ErrorContext = createContext<ErrorContextType>({
  errors: [],
  addError: () => {},
  removeError: () => {},
  clearErrors: () => {},
  hasError: () => false
});

// Error Provider
export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<AppError[]>([]);

  const addError = useCallback((errorData: Omit<AppError, 'id' | 'timestamp'>) => {
    const error: AppError = {
      ...errorData,
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setErrors(prev => {
      // Prevent duplicate errors
      const isDuplicate = prev.some(e => 
        e.type === error.type && 
        e.message === error.message && 
        Date.now() - e.timestamp.getTime() < 5000
      );
      
      if (isDuplicate) return prev;
      
      // Keep only last 10 errors
      const newErrors = [error, ...prev].slice(0, 10);
      
      // Show toast for user-facing errors
      if (error.recoverable) {
        toast.error(error.message, {
          description: error.userAction,
          duration: 5000,
          action: error.userAction ? {
            label: 'Retry',
            onClick: () => {
              // Retry logic would be handled by the component that added the error
            }
          } : undefined
        });
      }
      
      return newErrors;
    });

    // Log to console and analytics
    console.error('[Error]', error);
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: !error.recoverable,
        error_type: error.type
      });
    }
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const hasError = useCallback((type?: AppError['type']) => {
    if (!type) return errors.length > 0;
    return errors.some(error => error.type === type);
  }, [errors]);

  return (
    <ErrorContext.Provider value={{
      errors,
      addError,
      removeError,
      clearErrors,
      hasError
    }}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = () => useContext(ErrorContext);

// Loading State Manager
interface LoadingState {
  [key: string]: boolean;
}

interface LoadingContextType {
  loading: LoadingState;
  setLoading: (key: string, isLoading: boolean) => void;
  isLoading: (key?: string) => boolean;
  isAnyLoading: () => boolean;
}

const LoadingContext = createContext<LoadingContextType>({
  loading: {},
  setLoading: () => {},
  isLoading: () => false,
  isAnyLoading: () => false
});

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoadingState] = useState<LoadingState>({});

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      [key]: isLoading
    }));
  }, []);

  const isLoading = useCallback((key?: string) => {
    if (!key) return Object.values(loading).some(Boolean);
    return loading[key] || false;
  }, [loading]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loading).some(Boolean);
  }, [loading]);

  return (
    <LoadingContext.Provider value={{
      loading,
      setLoading,
      isLoading,
      isAnyLoading
    }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);

// Network Error Handler
export const NetworkErrorHandler: React.FC = () => {
  const { errors, removeError } = useError();
  const networkErrors = errors.filter(error => error.type === 'network');
  
  if (networkErrors.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
      {networkErrors.map(error => (
        <div
          key={error.id}
          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-2 shadow-lg animate-in slide-in-from-top-5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-red-800">
                Connection Problem
              </h4>
              <p className="text-sm text-red-700 mt-1">
                {error.message}
              </p>
              {error.userAction && (
                <p className="text-xs text-red-600 mt-2">
                  {error.userAction}
                </p>
              )}
            </div>
            <button
              onClick={() => removeError(error.id)}
              className="text-red-400 hover:text-red-600 p-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Global Loading Indicator
export const GlobalLoadingIndicator: React.FC = () => {
  const { isAnyLoading } = useLoading();
  
  if (!isAnyLoading()) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-blue-200">
        <div className="h-full bg-blue-600 animate-pulse" style={{ width: '30%' }} />
      </div>
    </div>
  );
};

// Error Boundary with Recovery
export class RecoverableErrorBoundary extends React.Component<
  { 
    children: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: { react: errorInfo }
      });
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} reset={this.reset} />;
    }

    return this.props.children;
  }
}

// Default Error Fallback with Recovery Options
const DefaultErrorFallback: React.FC<{ error: Error; reset: () => void }> = ({ error, reset }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Oops! Something went wrong
        </h1>
        
        <p className="text-gray-600 mb-6">
          Don't worry, this happens sometimes. Try refreshing the page or go back to the previous page.
        </p>

        <div className="space-y-3">
          <Button
            onClick={reset}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/care'}
            className="w-full"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-500"
            >
              <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              {showDetails ? 'Hide' : 'Show'} Error Details
            </Button>
            
            {showDetails && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
                <h3 className="font-medium text-gray-900 mb-2">Error Details:</h3>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-40">
                  {error.stack}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Async Error Handler Hook
export const useAsyncError = () => {
  const { addError } = useError();
  const { setLoading } = useLoading();

  const handleAsync = useCallback(async <T,>(
    operation: () => Promise<T>,
    options: {
      loadingKey?: string;
      errorMessage?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<T | null> => {
    const { loadingKey, errorMessage, onSuccess, onError } = options;

    try {
      if (loadingKey) {
        setLoading(loadingKey, true);
      }

      const result = await operation();
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const appError: Omit<AppError, 'id' | 'timestamp'> = {
        type: 'unknown',
        message: errorMessage || 'An unexpected error occurred',
        details: error instanceof Error ? error.message : String(error),
        recoverable: true,
        userAction: 'Please try again',
        context: { operation: operation.toString() }
      };

      // Determine error type based on error characteristics
      if (error instanceof TypeError && error.message.includes('fetch')) {
        appError.type = 'network';
        appError.message = 'Network connection failed';
        appError.userAction = 'Check your internet connection and try again';
      } else if (error instanceof Error && error.message.includes('permission')) {
        appError.type = 'permission';
        appError.message = 'Permission denied';
        appError.userAction = 'Please check your account permissions';
      } else if (error instanceof Error && error.message.includes('validation')) {
        appError.type = 'validation';
        appError.message = 'Invalid input provided';
        appError.userAction = 'Please check your input and try again';
      }

      addError(appError);
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
      
      return null;
    } finally {
      if (loadingKey) {
        setLoading(loadingKey, false);
      }
    }
  }, [addError, setLoading]);

  return { handleAsync };
};

// Validation Error Handler
export const useValidationError = () => {
  const { addError } = useError();

  const handleValidationError = useCallback((
    field: string,
    message?: string,
    context?: Record<string, any>
  ) => {
    addError({
      type: 'validation',
      message: message || `${field} is invalid`,
      recoverable: true,
      userAction: 'Please correct the highlighted field and try again',
      context: { field, ...context }
    });
  }, [addError]);

  return { handleValidationError };
};

// Retry Hook
export const useRetry = () => {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const retry = useCallback(async <T,>(
    operation: () => Promise<T>,
    delay: number = 1000
  ): Promise<T> => {
    try {
      const result = await operation();
      setRetryCount(0); // Reset on success
      return result;
    } catch (error) {
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retryCount)));
        return retry(operation, delay);
      } else {
        setRetryCount(0); // Reset after max retries
        throw error;
      }
    }
  }, [retryCount, maxRetries]);

  return { retry, retryCount, maxRetries };
};

export default {
  ErrorProvider,
  LoadingProvider,
  RecoverableErrorBoundary,
  NetworkErrorHandler,
  GlobalLoadingIndicator,
  useError,
  useLoading,
  useAsyncError,
  useValidationError,
  useRetry
};