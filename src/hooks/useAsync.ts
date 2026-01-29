/**
 * useAsync Hook
 * Reusable async operation state management
 *
 * Provides consistent loading, error, and data state handling
 */

import { useState, useCallback, useEffect, useRef } from 'react';

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: Error | null;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface UseAsyncOptions<T> {
  /** Initial data value */
  initialData?: T;
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Reset error after this many milliseconds */
  resetErrorAfter?: number;
  /** Automatically run on mount */
  runOnMount?: boolean;
}

interface UseAsyncReturn<T, Args extends unknown[]> extends AsyncState<T> {
  /** Execute the async function */
  run: (...args: Args) => Promise<T | undefined>;
  /** Reset to initial state */
  reset: () => void;
  /** Set data directly */
  setData: (data: T | null) => void;
  /** Set error directly */
  setError: (error: Error | null) => void;
}

/**
 * Hook for managing async operations with loading/error states
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data: user, isLoading, error, run } = useAsync(
 *     async (id: string) => {
 *       const response = await fetch(`/api/users/${id}`);
 *       return response.json();
 *     },
 *     { runOnMount: true }
 *   );
 *
 *   useEffect(() => {
 *     run(userId);
 *   }, [userId, run]);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!user) return null;
 *
 *   return <div>{user.name}</div>;
 * }
 * ```
 */
export function useAsync<T, Args extends unknown[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T, Args> {
  const {
    initialData,
    onSuccess,
    onError,
    resetErrorAfter,
    runOnMount = false,
  } = options;

  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [data, setDataState] = useState<T | null>(initialData ?? null);
  const [error, setErrorState] = useState<Error | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true);
  const asyncFunctionRef = useRef(asyncFunction);
  asyncFunctionRef.current = asyncFunction;

  // Track current execution to handle race conditions
  const executionIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (...args: Args): Promise<T | undefined> => {
    const currentExecutionId = ++executionIdRef.current;

    if (!mountedRef.current) return;

    setStatus('loading');
    setErrorState(null);

    try {
      const result = await asyncFunctionRef.current(...args);

      // Only update state if this is still the latest execution
      if (mountedRef.current && currentExecutionId === executionIdRef.current) {
        setDataState(result);
        setStatus('success');
        onSuccess?.(result);
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (mountedRef.current && currentExecutionId === executionIdRef.current) {
        setErrorState(error);
        setStatus('error');
        onError?.(error);

        // Auto-reset error after timeout
        if (resetErrorAfter) {
          setTimeout(() => {
            if (mountedRef.current && executionIdRef.current === currentExecutionId) {
              setErrorState(null);
              setStatus('idle');
            }
          }, resetErrorAfter);
        }
      }

      return undefined;
    }
  }, [onSuccess, onError, resetErrorAfter]);

  const reset = useCallback(() => {
    executionIdRef.current++;
    setStatus('idle');
    setDataState(initialData ?? null);
    setErrorState(null);
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setDataState(data);
    if (data !== null) {
      setStatus('success');
    }
  }, []);

  const setError = useCallback((error: Error | null) => {
    setErrorState(error);
    if (error) {
      setStatus('error');
    }
  }, []);

  // Run on mount if specified
  useEffect(() => {
    if (runOnMount) {
      run(...([] as unknown as Args));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    data,
    error,
    isIdle: status === 'idle',
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    run,
    reset,
    setData,
    setError,
  };
}

/**
 * Hook for async operations that should only run once
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useAsyncOnce(fetchUserProfile);
 * ```
 */
export function useAsyncOnce<T>(
  asyncFunction: () => Promise<T>,
  options: Omit<UseAsyncOptions<T>, 'runOnMount'> = {}
) {
  return useAsync(asyncFunction, { ...options, runOnMount: true });
}

/**
 * Hook for async operations with automatic retry
 */
export function useAsyncWithRetry<T, Args extends unknown[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> & {
    maxRetries?: number;
    retryDelay?: number;
  } = {}
) {
  const { maxRetries = 3, retryDelay = 1000, ...asyncOptions } = options;
  const retryCountRef = useRef(0);

  const wrappedFunction = useCallback(async (...args: Args): Promise<T> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await asyncFunction(...args);
        retryCountRef.current = 0;
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        retryCountRef.current = attempt + 1;

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }, [asyncFunction, maxRetries, retryDelay]);

  const async = useAsync(wrappedFunction, asyncOptions);

  return {
    ...async,
    retryCount: retryCountRef.current,
  };
}

/**
 * Hook for debounced async operations
 */
export function useDebouncedAsync<T, Args extends unknown[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  delay: number = 300,
  options: UseAsyncOptions<T> = {}
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const async = useAsync(asyncFunction, options);

  const debouncedRun = useCallback((...args: Args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    return new Promise<T | undefined>((resolve) => {
      timeoutRef.current = setTimeout(async () => {
        const result = await async.run(...args);
        resolve(result);
      }, delay);
    });
  }, [async.run, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...async,
    run: debouncedRun,
  };
}

export default useAsync;
