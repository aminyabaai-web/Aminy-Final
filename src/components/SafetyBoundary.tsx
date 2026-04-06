// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackComponent?: 'minimal' | 'detailed' | 'dashboard';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * SafetyBoundary - Production-grade error boundary with graceful fallbacks
 * Prevents app crashes and provides user-friendly error states
 */
export class SafetyBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SafetyBoundary caught an error:', error, errorInfo);
    
    // Log to analytics if available
    const win = window as Window & { analytics?: { track: (event: string, data: Record<string, unknown>) => void } };
    if (typeof window !== 'undefined' && win.analytics) {
      win.analytics.track('error_boundary_triggered', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  renderMinimalFallback() {
    return (
      <div className="flex items-center justify-center min-h-32 p-4">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Something went wrong
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  renderDetailedFallback() {
    const { error } = this.state;
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full">
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Oops! Something went wrong
            </h2>
            
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
              We encountered an unexpected error. This has been automatically reported to our team.
            </p>

            {process.env.NODE_ENV === 'development' && error && (
              <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4 text-left">
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderDashboardFallback() {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg"></div>
              <h1 className="text-lg sm:text-xl font-semibold text-foreground">Aminy</h1>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </div>
            
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Dashboard Temporarily Unavailable
            </h2>
            
            <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto">
              We're experiencing a temporary issue loading your dashboard. 
              Our team has been notified and is working on a fix.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-sm mx-auto">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Retry Dashboard
              </button>
              
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                <Home className="w-5 h-5" />
                Reload App
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      const { fallbackComponent = 'detailed' } = this.props;
      
      switch (fallbackComponent) {
        case 'minimal':
          return this.renderMinimalFallback();
        case 'dashboard':
          return this.renderDashboardFallback();
        case 'detailed':
        default:
          return this.renderDetailedFallback();
      }
    }

    return this.props.children;
  }
}

/**
 * Convenience wrapper components for different use cases
 */
export const MinimalSafetyBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <SafetyBoundary fallbackComponent="minimal">{children}</SafetyBoundary>
);

export const DashboardSafetyBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <SafetyBoundary fallbackComponent="dashboard">{children}</SafetyBoundary>
);

export const DetailedSafetyBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <SafetyBoundary fallbackComponent="detailed">{children}</SafetyBoundary>
);