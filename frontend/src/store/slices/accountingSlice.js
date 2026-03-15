import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { accountingAPI } from '../../services/apiMethods';

export const fetchAccounting = createAsyncThunk(
  'accounting/fetchAccounting',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await accountingAPI.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch accounting');
    }
  }
);

export const fetchAccountingById = createAsyncThunk(
  'accounting/fetchAccountingById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await accountingAPI.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch accounting');
    }
  }
);

export const createAccounting = createAsyncThunk(
  'accounting/createAccounting',
  async (data, { rejectWithValue }) => {
    try {
      const response = await accountingAPI.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create accounting');
    }
  }
);

export const updateAccounting = createAsyncThunk(
  'accounting/updateAccounting',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await accountingAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update accounting');
    }
  }
);

export const deleteAccounting = createAsyncThunk(
  'accounting/deleteAccounting',
  async (id, { rejectWithValue }) => {
    try {
      await accountingAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete accounting');
    }
  }
);

export const approveAccounting = createAsyncThunk(
  'accounting/approveAccounting',
  async (id, { rejectWithValue }) => {
    try {
      const response = await accountingAPI.approve(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to approve accounting');
    }
  }
);

export const rejectAccounting = createAsyncThunk(
  'accounting/rejectAccounting',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await accountingAPI.reject(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject accounting');
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

const accountingSlice = createSlice({
  name: 'accounting',
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
      .addCase(fetchAccounting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccounting.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || action.payload;
      })
      .addCase(fetchAccounting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAccountingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccountingById.fulfilled, (state, action) => {
        state.loading = false;
        state.item = action.payload.data || action.payload;
      })
      .addCase(fetchAccountingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createAccounting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAccounting.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items.push(action.payload.data || action.payload);
      })
      .addCase(createAccounting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateAccounting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAccounting.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(item => item._id === action.payload.data._id);
        if (index !== -1) {
          state.items[index] = action.payload.data;
        }
      })
      .addCase(updateAccounting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteAccounting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAccounting.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items = state.items.filter(item => item._id !== action.payload);
      })
      .addCase(deleteAccounting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      .addCase(approveAccounting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(approveAccounting.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(item => item._id === action.payload.data._id);
        if (index !== -1) {
          state.items[index] = action.payload.data;
        }
      })
      .addCase(approveAccounting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(rejectAccounting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejectAccounting.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(item => item._id === action.payload.data._id);
        if (index !== -1) {
          state.items[index] = action.payload.data;
        }
      })
      .addCase(rejectAccounting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

  },
});

export const { clearError, clearSuccess, clearItem } = accountingSlice.actions;
export default accountingSlice.reducer;
