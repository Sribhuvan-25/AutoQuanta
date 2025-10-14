'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log to external service if needed
    this.logErrorToService(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Log errors for debugging - could be sent to external service
    const errorLog = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    console.log('Error Log:', JSON.stringify(errorLog, null, 2));

    // TODO: Send to external logging service (Sentry, LogRocket, etc.)
    // Example: logToSentry(errorLog);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    this.handleReset();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl shadow-xl p-8">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-100 rounded-2xl border border-red-200">
                <AlertTriangle className="h-16 w-16 text-red-600" />
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-3">
              Oops! Something went wrong
            </h1>
            <p className="text-lg text-gray-600 text-center mb-8">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Error Details (Development Only)</h3>
                <p className="text-sm text-red-600 font-mono mb-2">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="text-xs text-gray-600 font-mono mt-2">
                    <summary className="cursor-pointer text-gray-700 font-semibold mb-1">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 p-3 bg-white border border-gray-200 rounded-lg overflow-x-auto whitespace-pre-wrap break-words">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                size="lg"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-5 w-5" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                size="lg"
                className="flex items-center gap-2"
              >
                <Home className="h-5 w-5" />
                Go to Dashboard
              </Button>
            </div>

            {/* Help Text */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-900">
                <strong>What you can do:</strong>
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                <li>Try refreshing the page</li>
                <li>Clear your browser cache</li>
                <li>Check if your data file is in the correct format</li>
                <li>Make sure the backend server is running</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use in function components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
