import React from 'react';
import { clientLog, getCorrelationId } from '../lib/observability';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    clientLog('error', 'frontend.error_boundary.caught', {
      correlationId: getCorrelationId(),
      metadata: {
        message: error?.message,
        componentStack: errorInfo?.componentStack,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
          <div className="bg-surface p-8 rounded-xl border border-surface-border shadow-sm max-w-md w-full text-center">
            <div className="text-verdict-fail text-4xl mb-4">!</div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Something went wrong</h2>
            <p className="text-sm text-text-secondary mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="px-4 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
