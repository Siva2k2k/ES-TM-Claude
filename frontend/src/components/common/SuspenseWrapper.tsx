import React, { Suspense, Component, ReactNode } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
          <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-6 mb-4">
            <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-slate-600 dark:text-gray-400 mb-6 max-w-md text-center">
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <div className="flex gap-3">
            <Button onClick={this.retry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="default">
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Suspense Wrapper Component
 * Combines Suspense with Error Boundary for lazy-loaded components
 */
interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function SuspenseWrapper({
  children,
  fallback,
  errorFallback,
  onError
}: SuspenseWrapperProps) {
  return (
    <ErrorBoundary fallback={errorFallback} onError={onError}>
      <Suspense fallback={fallback || <LoadingSpinner size="lg" text="Loading..." />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Page Suspense Wrapper
 * Full-screen loading for page-level lazy loading
 */
export function PageSuspenseWrapper({ children }: { children: ReactNode }) {
  return (
    <SuspenseWrapper
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="xl" text="Loading page..." />
        </div>
      }
      errorFallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md p-8">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-6 mb-4 inline-block">
              <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100 mb-2">
              Failed to load page
            </h1>
            <p className="text-slate-600 dark:text-gray-400 mb-6">
              The page could not be loaded. Please check your connection and try again.
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </SuspenseWrapper>
  );
}

/**
 * Component Suspense Wrapper
 * Inline loading for component-level lazy loading
 */
export function ComponentSuspenseWrapper({ children }: { children: ReactNode }) {
  return (
    <SuspenseWrapper
      fallback={
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      }
    >
      {children}
    </SuspenseWrapper>
  );
}

export default SuspenseWrapper;
