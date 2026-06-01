import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 s — prevents indefinite hangs on slow/unresponsive backend
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach stored JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear local auth data
      localStorage.removeItem('authToken');

      // /auth/me returning 401 is expected when not logged in — don't redirect
      const isAuthCheck = error.config?.url === '/auth/me';
      const onAuthPage = ['/login', '/register', '/'].includes(window.location.pathname);

      if (!isAuthCheck && !onAuthPage) {
        // Use history API to avoid a full hard reload where possible.
        // A full redirect is acceptable here since it also resets React/Redux state cleanly.
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
