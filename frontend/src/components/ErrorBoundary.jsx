import React from 'react';
import { AlertCircle } from 'lucide-react';
import Button from './ui/Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg border border-neutral-200 shadow-sm p-8 text-center">
            <div className="mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-neutral-600 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={this.reset} fullWidth>
                Try again
              </Button>
              <Button
                variant="primary"
                onClick={() => window.location.href = '/'}
                fullWidth
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
