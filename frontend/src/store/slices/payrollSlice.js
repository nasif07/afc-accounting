import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const fetchPayrolls = createAsyncThunk(
  'payroll/fetchPayrolls',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/payroll`, getAuthHeader());
      return response.data.payrolls;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payrolls');
    }
  }
);

export const createPayroll = createAsyncThunk(
  'payroll/createPayroll',
  async (payrollData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/payroll`, payrollData, getAuthHeader());
      return response.data.payroll;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create payroll');
    }
  }
);

const initialState = {
  payrolls: [],
  isLoading: false,
  error: null,
};

const payrollSlice = createSlice({
  name: 'payroll',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayrolls.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPayrolls.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payrolls = action.payload;
      })
      .addCase(fetchPayrolls.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createPayroll.fulfilled, (state, action) => {
        state.payrolls.push(action.payload);
      });
  },
});

export const { clearError } = payrollSlice.actions;
export default payrollSlice.reducer;
