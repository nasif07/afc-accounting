import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable sending cookies with requests (httpOnly cookies)
  withCredentials: true,
});

// REQUEST INTERCEPTOR - ADD TOKEN TO HEADERS
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR - HANDLE 401 & TOKEN STORAGE
api.interceptors.response.use(
  (response) => {
    // EXTRACT AND STORE TOKEN FROM RESPONSE
    if (response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state on 401
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
