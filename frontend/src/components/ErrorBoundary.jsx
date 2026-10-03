import React, { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { AlertCircle } from 'lucide-react';
import { Button } from './common';
import { isChunkLoadError, reloadOnceForChunkError } from '../utils/chunkReload';

function ErrorScreen({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
        <div className="mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <AlertCircle size={24} className="text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          {isChunkLoadError(error)
            ? 'A new version of the app is available. Please reload the page.'
            : error?.message || error?.statusText || 'An unexpected error occurred'}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onRetry} fullWidth>
            Try again
          </Button>
          <Button
            variant="primary"
            onClick={() => (window.location.href = '/')}
            fullWidth
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

// Used as a route `errorElement`: React Router renders it with no children
// and exposes the error only through useRouteError(). The class boundary
// below used to render `this.props.children` (undefined) here, which is why a
// crashed route showed a blank white page instead of any message.
function RouteErrorScreen() {
  const error = useRouteError();

  useEffect(() => {
    console.error('Route error:', error);
    if (isChunkLoadError(error)) reloadOnceForChunkError();
  }, [error]);

  return <ErrorScreen error={error} onRetry={() => window.location.reload()} />;
}

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
    if (isChunkLoadError(error)) reloadOnceForChunkError();
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorScreen error={this.state.error} onRetry={this.reset} />;
    }

    // No children means we're mounted as a route errorElement.
    if (this.props.children === undefined) {
      return <RouteErrorScreen />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
