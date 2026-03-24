import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const register = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/register', userData);
    // STORE TOKEN
    if (response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Registration failed');
  }
});

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/login', credentials);
    // STORE TOKEN
    if (response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Login failed');
  }
});

export const getCurrentUser = createAsyncThunk('auth/getCurrentUser', async (_, { rejectWithValue }) => {
  try {
    // TRY TO GET TOKEN FROM STORAGE FIRST
    const token = localStorage.getItem('authToken');
    if (!token) {
      return rejectWithValue(null);
    }
    
    const response = await api.get('/auth/me');
    return response.data.data || response.data;
  } catch (error) {
    // CLEAR TOKEN ON ERROR
    localStorage.removeItem('authToken');
    return rejectWithValue(null);
  }
});

export const logoutAsync = createAsyncThunk('auth/logoutAsync', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout');
    // CLEAR TOKEN ON LOGOUT
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    return null;
  } catch (error) {
    // Clear anyway
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
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
      localStorage.removeItem('authToken');
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
        state.user = action.payload?.user || action.payload;
        state.isAuthenticated = !!state.user;
        state.isPending = state.user?.status === 'pending';
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
