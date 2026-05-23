import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const normalizeAuthPayload = (payload) => {
  const data = payload?.data || payload || {};

  return {
    user: data.user || payload?.user || null,
    token: data.token || payload?.token || null,
  };
};

const persistAuthSession = ({ user, token }) => {
  if (token) {
    localStorage.setItem("authToken", token);
    localStorage.setItem("token", token);
  }
  if (user) localStorage.setItem("user", JSON.stringify(user));
};

const clearAuthSession = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const register = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/register', userData);
    const authData = normalizeAuthPayload(response.data);

    if (authData.user?.status === "approved") {
      persistAuthSession(authData);
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
    persistAuthSession(authData);

    return authData;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Login failed');
  }
});

export const getCurrentUser = createAsyncThunk('auth/getCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/auth/me');
    // Handle both response formats: { user: {...} } or direct user object
    const user = response.data?.user || response.data?.data?.user || response.data;
    if (user) localStorage.setItem("user", JSON.stringify(user));
    return user;
  } catch (error) {
    // 401 is expected when no cookie exists - not an error
    clearAuthSession();
    return null;
  }
});

export const logoutAsync = createAsyncThunk('auth/logoutAsync', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout');
    // Cookie is cleared by backend
  } catch (error) {
    // Clear anyway
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
  isPending: false,  // Track pending approval status
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isPending = false;
      state.loading = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isPending = action.payload?.status === 'pending';
      state.isAuthenticated = action.payload?.status === 'approved';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        // Check if pending approval
        state.isPending = action.payload.user?.status === 'pending';
        state.isAuthenticated = action.payload.user?.status === 'approved';
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isPending = action.payload.user?.status === 'pending';
        state.isAuthenticated = action.payload.user?.status === 'approved';
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        // Handle null payload (no cookie exists)
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
      .addCase(getCurrentUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.isPending = false;
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
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectIsPending = (state) => state.auth.isPending;
export default authSlice.reducer;
