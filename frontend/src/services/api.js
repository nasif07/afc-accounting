import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable sending cookies with requests (httpOnly cookies from backend)
  withCredentials: true,
});

// RESPONSE INTERCEPTOR - HANDLE 401
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect for auth check endpoint (getCurrentUser)
      // This endpoint returns 401 if no session exists, which is normal
      const isAuthCheckEndpoint = error.config?.url?.includes('/auth/me');
      
      // Only redirect if not already on auth pages AND not checking auth status
      const pathname = window.location.pathname;
      if (
        !isAuthCheckEndpoint &&
        pathname !== '/login' &&
        pathname !== '/register' &&
        pathname !== '/'
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
