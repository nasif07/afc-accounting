import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { bankAPI } from '../../services/apiMethods';

export const fetchBank = createAsyncThunk(
  'bank/fetchBank',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await bankAPI.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch bank');
    }
  }
);

export const fetchBankById = createAsyncThunk(
  'bank/fetchBankById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await bankAPI.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch bank');
    }
  }
);

export const createBank = createAsyncThunk(
  'bank/createBank',
  async (data, { rejectWithValue }) => {
    try {
      const response = await bankAPI.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create bank');
    }
  }
);

export const updateBank = createAsyncThunk(
  'bank/updateBank',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await bankAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update bank');
    }
  }
);

export const deleteBank = createAsyncThunk(
  'bank/deleteBank',
  async (id, { rejectWithValue }) => {
    try {
      await bankAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete bank');
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

const bankSlice = createSlice({
  name: 'bank',
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
      .addCase(fetchBank.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBank.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || action.payload;
      })
      .addCase(fetchBank.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchBankById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBankById.fulfilled, (state, action) => {
        state.loading = false;
        state.item = action.payload.data || action.payload;
      })
      .addCase(fetchBankById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createBank.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBank.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items.push(action.payload.data || action.payload);
      })
      .addCase(createBank.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateBank.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBank.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(item => item._id === action.payload.data._id);
        if (index !== -1) {
          state.items[index] = action.payload.data;
        }
      })
      .addCase(updateBank.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteBank.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBank.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items = state.items.filter(item => item._id !== action.payload);
      })
      .addCase(deleteBank.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
  },
});

export const { clearError, clearSuccess, clearItem } = bankSlice.actions;
export default bankSlice.reducer;
