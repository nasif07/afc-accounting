import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 s — prevents indefinite hangs on slow/unresponsive backend
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Bare client for the refresh call itself — no interceptors attached, so a
// failed refresh can never re-enter the response interceptor below and
// recurse. Cookies (including the path-scoped refresh-token cookie) are
// handled by the browser regardless of which axios instance makes the call.
const refreshClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Single-flight refresh: if several requests 401 at once (e.g. multiple
// components fetching on mount right as the access token expires), they all
// share this one in-flight refresh instead of each firing their own
// POST /auth/refresh. Reset to null once settled so a later genuine expiry
// can trigger a fresh refresh.
let refreshPromise = null;

const AUTH_PAGES = ['/login', '/register', '/'];

function redirectToLogin() {
  // Use history API to avoid a full hard reload where possible.
  // A full redirect is acceptable here since it also resets React/Redux state cleanly.
  window.location.href = '/login';
}

// Global response error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Network-level/cancelled errors have no config to retry against.
    if (!error.config) return Promise.reject(error);

    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest.url;

    // /auth/me's 401 is ambiguous on its own: it fires both for "never
    // logged in" (no refresh token either) AND for "access token expired,
    // refresh token still valid" — the normal steady-state case on any hard
    // page reload. It must attempt the same refresh-and-retry as every other
    // request below; only the *final give-up* behavior differs (see the
    // isAuthCheck checks further down) — a still-unauthenticated /auth/me
    // is an expected result for callers like getCurrentUser() to interpret,
    // not a hard error that should force-navigate the page.
    const isAuthCheck = requestUrl === '/auth/me';
    // A 401 from the refresh endpoint itself means the refresh token is
    // invalid/expired/revoked — there's nothing left to retry with, and
    // attempting to "refresh the refresh" would recurse forever.
    const isRefreshCall = requestUrl === '/auth/refresh';
    const onAuthPage = AUTH_PAGES.includes(window.location.pathname);

    if (status === 401 && !isRefreshCall && !originalRequest._retry) {
      // Mark before awaiting so a second failure on the retried request
      // (below) falls through to a plain redirect instead of looping.
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post('/auth/refresh')
          .then(() => undefined)
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        await refreshPromise;
      } catch {
        // Refresh also failed — there is genuinely no session. For /auth/me
        // this is a normal "not logged in" outcome that getCurrentUser()'s
        // own catch block + ProtectedRoute already handle via isAuthenticated;
        // forcing a hard redirect here too would double up with that (and
        // would fire even while already sitting on /login).
        if (!isAuthCheck && !onAuthPage) redirectToLogin();
        return Promise.reject(error);
      }

      // Refresh succeeded — replay the original request exactly once and
      // hand its result straight back to the original caller.
      return api(originalRequest);
    }

    if (status === 401 && !isAuthCheck && !onAuthPage) {
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);

export default api;
