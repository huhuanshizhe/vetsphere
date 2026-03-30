'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class StripeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[StripeErrorBoundary] Caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h3 className="font-bold text-red-700">Payment Form Error</h3>
          </div>
          <p className="text-red-600 mb-2">
            Failed to render payment form
          </p>
          {this.state.error && (
            <details className="text-sm text-red-500">
              <summary>Error details</summary>
              <p className="mt-2 font-mono">{this.state.error.message}</p>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default StripeErrorBoundary;
