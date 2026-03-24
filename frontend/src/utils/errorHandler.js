import { toast } from 'sonner';

/**
 * Error Handler Utility
 * Centralized error handling for the application
 */

export const ErrorHandler = {
  /**
   * Log error to console (development only)
   */
  log: (error, context = '') => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context}]`, error);
    }
  },

  /**
   * Show error toast
   */
  showToast: (message, duration = 5000) => {
    toast.error(message, { duration });
  },

  /**
   * Handle API error
   */
  handleApiError: (error, context = '') => {
    ErrorHandler.log(error, context);

    // Handle specific error codes
    if (error.response?.status === 400) {
      const message = error.response.data?.message || 'Invalid request';
      ErrorHandler.showToast(message);
      return { status: 400, message };
    }

    if (error.response?.status === 401) {
      ErrorHandler.showToast('Unauthorized. Please login again.');
      window.location.href = '/login';
      return { status: 401, message: 'Unauthorized' };
    }

    if (error.response?.status === 403) {
      ErrorHandler.showToast('You do not have permission to perform this action.');
      return { status: 403, message: 'Forbidden' };
    }

    if (error.response?.status === 404) {
      ErrorHandler.showToast('Resource not found.');
      return { status: 404, message: 'Not Found' };
    }

    if (error.response?.status >= 500) {
      ErrorHandler.showToast('Server error. Please try again later.');
      return { status: 500, message: 'Server Error' };
    }

    if (!error.response) {
      ErrorHandler.showToast('Network error. Please check your connection.');
      return { status: 0, message: 'Network Error' };
    }

    ErrorHandler.showToast(error.message || 'An error occurred');
    return { status: -1, message: error.message };
  },

  /**
   * Handle form validation error
   */
  handleValidationError: (errors) => {
    const errorMessages = Object.entries(errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join('\n');

    ErrorHandler.showToast(errorMessages);
    return errors;
  },

  /**
   * Handle async operation with error handling
   */
  handleAsync: async (asyncFn, context = '', successMessage = '') => {
    try {
      const result = await asyncFn();
      if (successMessage) {
        toast.success(successMessage);
      }
      return { success: true, data: result };
    } catch (error) {
      ErrorHandler.handleApiError(error, context);
      return { success: false, error };
    }
  },

  /**
   * Create error boundary fallback
   */
  createErrorBoundaryFallback: (error, resetError) => {
    return {
      title: 'Something went wrong',
      message: error?.message || 'An unexpected error occurred',
      action: resetError,
      actionLabel: 'Try again',
    };
  },

  /**
   * Retry logic with exponential backoff
   */
  retryWithBackoff: async (fn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  },
};

/**
 * Custom Error Classes
 */

export class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

export class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'You do not have permission') {
    super(message);
    this.name = 'AuthorizationError';
  }
}
