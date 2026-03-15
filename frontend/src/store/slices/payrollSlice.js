import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { payrollAPI } from '../../services/apiMethods';

export const fetchPayroll = createAsyncThunk(
  'payroll/fetchPayroll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await payrollAPI.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payroll');
    }
  }
);

export const fetchPayrollById = createAsyncThunk(
  'payroll/fetchPayrollById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await payrollAPI.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payroll');
    }
  }
);

export const createPayroll = createAsyncThunk(
  'payroll/createPayroll',
  async (data, { rejectWithValue }) => {
    try {
      const response = await payrollAPI.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create payroll');
    }
  }
);

export const updatePayroll = createAsyncThunk(
  'payroll/updatePayroll',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await payrollAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update payroll');
    }
  }
);

export const deletePayroll = createAsyncThunk(
  'payroll/deletePayroll',
  async (id, { rejectWithValue }) => {
    try {
      await payrollAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete payroll');
    }
  }
);

export const approvePayroll = createAsyncThunk(
  'payroll/approvePayroll',
  async (id, { rejectWithValue }) => {
    try {
      const response = await payrollAPI.approve(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to approve payroll');
    }
  }
);

export const rejectPayroll = createAsyncThunk(
  'payroll/rejectPayroll',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await payrollAPI.reject(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject payroll');
    }
  }
);


const initialState = {
  items: [],
  item: null,
  loading: false,
  error: null,
  success: false,
};

const payrollSlice = createSlice({
  name: 'payroll',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
    clearItem: (state) => {
      state.item = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayroll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayroll.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || action.payload;
      })
      .addCase(fetchPayroll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchPayrollById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayrollById.fulfilled, (state, action) => {
        state.loading = false;
        state.item = action.payload.data || action.payload;
      })
      .addCase(fetchPayrollById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createPayroll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPayroll.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items.push(action.payload.data || action.payload);
      })
      .addCase(createPayroll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updatePayroll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePayroll.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(item => item._id === action.payload.data._id);
        if (index !== -1) {
          state.items[index] = action.payload.data;
        }
      })
      .addCase(updatePayroll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deletePayroll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePayroll.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items = state.items.filter(item => item._id !== action.payload);
      })
      .addCase(deletePayroll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(approvePayroll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(approvePayroll.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(item => item._id === action.payload.data._id);
        if (index !== -1) {
          state.items[index] = action.payload.data;
        }
      })
      .addCase(approvePayroll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(rejectPayroll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejectPayroll.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(item => item._id === action.payload.data._id);
        if (index !== -1) {
          state.items[index] = action.payload.data;
        }
      })
      .addCase(rejectPayroll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

  },
});

export const { clearError, clearSuccess, clearItem } = payrollSlice.actions;
export default payrollSlice.reducer;
