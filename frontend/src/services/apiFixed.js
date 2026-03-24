import axios from 'axios';
import { toast } from 'sonner';

// Get API base URL from environment or use default
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and refresh token
api.interceptors.response.use(
  (response) => {
    // Handle success responses
    return response;
  },
  (error) => {
    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    }

    // Handle 403 - Forbidden
    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    }

    // Handle 404 - Not Found
    if (error.response?.status === 404) {
      toast.error('Resource not found.');
    }

    // Handle 500 - Server Error
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
    }

    return Promise.reject(error);
  }
);

export default api;

/**
 * Utility functions for common API operations
 */

export const apiUtils = {
  /**
   * Format error message from API response
   */
  getErrorMessage: (error) => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return 'An error occurred. Please try again.';
  },

  /**
   * Handle API call with proper error handling
   */
  handleApiCall: async (apiCall, successMessage = '', errorMessage = '') => {
    try {
      const response = await apiCall();
      if (successMessage) {
        toast.success(successMessage);
      }
      return { success: true, data: response.data };
    } catch (error) {
      const message = errorMessage || apiUtils.getErrorMessage(error);
      toast.error(message);
      return { success: false, error: message };
    }
  },

  /**
   * Convert cents to decimal format
   */
  centsToDecimal: (cents) => {
    return (cents / 100).toFixed(2);
  },

  /**
   * Convert decimal to cents format
   */
  decimalToCents: (decimal) => {
    return Math.round(decimal * 100);
  },
};
