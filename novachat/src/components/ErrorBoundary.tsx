import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
          <div className="max-w-[420px] text-center">
            <div className="w-[72px] h-[72px] rounded-[22px] bg-red-500/15 flex items-center justify-center mx-auto mb-6">
              <svg className="w-9 h-9 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-3">Something went wrong</h2>
            <p className="text-[var(--text-secondary)] text-[15px] mb-6 leading-relaxed">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-[var(--text-muted)] text-[13px] cursor-pointer hover:text-[var(--text-secondary)] transition-colors">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-[12px] text-[12px] text-red-400 overflow-x-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gradient-end)] text-white font-semibold text-[15px] rounded-[16px] hover:from-[var(--accent-secondary)] hover:to-[var(--accent-primary)] transition-all shadow-[var(--accent-shadow-lg)]"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
