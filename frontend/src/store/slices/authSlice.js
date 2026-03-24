import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const register = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/register', userData);
    // Token is set in httpOnly cookie by backend, not in response
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Registration failed');
  }
});

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/login', credentials);
    // Token is set in httpOnly cookie by backend, not in response
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Login failed');
  }
});

export const getCurrentUser = createAsyncThunk('auth/getCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/auth/me');
    // Handle both response formats: { user: {...} } or direct user object
    return response.data?.user || response.data?.data || response.data;
  } catch (error) {
    // 401 is expected when no cookie exists - not an error
    return null;
  }
});

export const logoutAsync = createAsyncThunk('auth/logoutAsync', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout');
    // Cookie is cleared by backend
    return null;
  } catch (error) {
    // Clear anyway
    return null;
  }
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
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isPending = action.payload?.status === 'pending';
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
        state.isAuthenticated = true;
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
          state.isAuthenticated = !!state.user;
          state.isPending = state.user?.status === 'pending';
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
