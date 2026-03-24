import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchAccounts = createAsyncThunk(
  'accounts/fetchAccounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/accounts');
      return response.data.accounts;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch accounts');
    }
  }
);

export const createAccount = createAsyncThunk(
  'accounts/createAccount',
  async (accountData, { rejectWithValue }) => {
    try {
      const response = await api.post('/accounts', accountData);
      return response.data.account;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create account');
    }
  }
);

export const updateAccount = createAsyncThunk(
  'accounts/updateAccount',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/accounts/${id}`, data);
      return response.data.account;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update account');
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'accounts/deleteAccount',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/accounts/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete account');
    }
  }
);

const initialState = {
  accounts: [],
  isLoading: false,
  error: null,
};

const accountSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accounts = action.payload;
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createAccount.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accounts.push(action.payload);
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        const index = state.accounts.findIndex(acc => acc._id === action.payload._id);
        if (index !== -1) {
          state.accounts[index] = action.payload;
        }
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.accounts = state.accounts.filter(acc => acc._id !== action.payload);
      });
  },
});

export const { clearError } = accountSlice.actions;
export default accountSlice.reducer;
