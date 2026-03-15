import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { receiptAPI } from '../../services/apiMethods';

export const fetchReceipts = createAsyncThunk(
  'receipts/fetchReceipts',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await receiptAPI.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch receipts');
    }
  }
);

export const fetchReceiptById = createAsyncThunk(
  'receipts/fetchReceiptById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await receiptAPI.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch receipt');
    }
  }
);

export const createReceipt = createAsyncThunk(
  'receipts/createReceipt',
  async (data, { rejectWithValue }) => {
    try {
      const response = await receiptAPI.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create receipt');
    }
  }
);

export const updateReceipt = createAsyncThunk(
  'receipts/updateReceipt',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await receiptAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update receipt');
    }
  }
);

export const deleteReceipt = createAsyncThunk(
  'receipts/deleteReceipt',
  async (id, { rejectWithValue }) => {
    try {
      await receiptAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete receipt');
    }
  }
);

export const approveReceipt = createAsyncThunk(
  'receipts/approveReceipt',
  async (id, { rejectWithValue }) => {
    try {
      const response = await receiptAPI.approve(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to approve receipt');
    }
  }
);

export const rejectReceipt = createAsyncThunk(
  'receipts/rejectReceipt',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await receiptAPI.reject(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject receipt');
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

const receiptSlice = createSlice({
  name: 'receipts',
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
      .addCase(fetchReceipts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceipts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || action.payload;
      })
      .addCase(fetchReceipts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchReceiptById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceiptById.fulfilled, (state, action) => {
        state.loading = false;
        state.item = action.payload.data || action.payload;
      })
      .addCase(fetchReceiptById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createReceipt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createReceipt.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items.push(action.payload.data || action.payload);
      })
      .addCase(createReceipt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateReceipt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateReceipt.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(item => item._id === action.payload.data._id);
        if (index !== -1) {
          state.items[index] = action.payload.data;
        }
      })
      .addCase(updateReceipt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteReceipt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteReceipt.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items = state.items.filter(item => item._id !== action.payload);
      })
      .addCase(deleteReceipt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(approveReceipt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(approveReceipt.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(item => item._id === action.payload.data._id);
        if (index !== -1) {
          state.items[index] = action.payload.data;
        }
      })
      .addCase(approveReceipt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(rejectReceipt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejectReceipt.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(item => item._id === action.payload.data._id);
        if (index !== -1) {
          state.items[index] = action.payload.data;
        }
      })
      .addCase(rejectReceipt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSuccess, clearItem } = receiptSlice.actions;
export default receiptSlice.reducer;
