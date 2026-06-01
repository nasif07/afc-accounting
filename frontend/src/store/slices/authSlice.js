import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const normalizeAuthPayload = (payload) => {
  const data = payload?.data || payload || {};
  return {
    user:  data.user  || payload?.user  || null,
    token: data.token || payload?.token || null,
  };
};

// Only the token is persisted — never the user object.
// Caching the user object causes stale role/permission data after an admin changes a user's role.
// The authoritative user state is always loaded fresh from GET /auth/me on startup.
const persistToken = (token) => {
  if (token) localStorage.setItem('authToken', token);
};

const clearAuthSession = () => {
  localStorage.removeItem('authToken');
};

export const register = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/register', userData);
    const authData = normalizeAuthPayload(response.data);
    if (authData.user?.status === 'approved') {
      persistToken(authData.token);
    }
    return authData;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Registration failed');
  }
});

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/login', credentials);
    const authData = normalizeAuthPayload(response.data);
    persistToken(authData.token);
    return authData;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Login failed');
  }
});

export const getCurrentUser = createAsyncThunk('auth/getCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/auth/me');
    return response.data?.user || response.data?.data?.user || response.data;
  } catch (error) {
    const status = error.response?.status;
    if (!status || status === 401 || status === 403) {
      clearAuthSession();
      return null;
    }
    return rejectWithValue(error.response?.data?.message || 'Session check failed');
  }
});

export const logoutAsync = createAsyncThunk('auth/logoutAsync', async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Always clear locally even if the server request fails
  } finally {
    clearAuthSession();
  }
  return null;
});

const initialState = {
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  isPending: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      clearAuthSession();
      state.user = null;
      state.isAuthenticated = false;
      state.isPending = false;
      state.loading = false;
      state.error = null;
    },
    clearError: (state) => { state.error = null; },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isPending = action.payload?.status === 'pending';
      state.isAuthenticated = action.payload?.status === 'approved';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isPending = action.payload.user?.status === 'pending';
        state.isAuthenticated = action.payload.user?.status === 'approved';
      })
      .addCase(register.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(login.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isPending = action.payload.user?.status === 'pending';
        state.isAuthenticated = action.payload.user?.status === 'approved';
      })
      .addCase(login.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(getCurrentUser.pending,   (state) => { state.loading = true; })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload === null) {
          state.user = null;
          state.isAuthenticated = false;
          state.isPending = false;
        } else {
          state.user = action.payload;
          state.isPending = state.user?.status === 'pending';
          state.isAuthenticated = state.user?.status === 'approved';
        }
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.isPending = false;
        state.error = action.payload ?? null;
      })

      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isPending = false;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { logout, clearError, setUser } = authSlice.actions;
export const selectUser            = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading     = (state) => state.auth.loading;
export const selectAuthError       = (state) => state.auth.error;
export const selectIsPending       = (state) => state.auth.isPending;
export default authSlice.reducer;
