import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { coaAPI } from '../../services/apiMethods';

export const fetchCoa = createAsyncThunk(
  'coa/fetchCoa',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await coaAPI.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch coa');
    }
  }
);

export const fetchCoaById = createAsyncThunk(
  'coa/fetchCoaById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await coaAPI.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch coa');
    }
  }
);

export const createCoa = createAsyncThunk(
  'coa/createCoa',
  async (data, { rejectWithValue }) => {
    try {
      const response = await coaAPI.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create coa');
    }
  }
);

export const updateCoa = createAsyncThunk(
  'coa/updateCoa',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await coaAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update coa');
    }
  }
);

export const deleteCoa = createAsyncThunk(
  'coa/deleteCoa',
  async (id, { rejectWithValue }) => {
    try {
      await coaAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete coa');
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

const coaSlice = createSlice({
  name: 'coa',
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
      .addCase(fetchCoa.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCoa.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || action.payload;
      })
      .addCase(fetchCoa.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCoaById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCoaById.fulfilled, (state, action) => {
        state.loading = false;
        state.item = action.payload.data || action.payload;
      })
      .addCase(fetchCoaById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createCoa.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCoa.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items.push(action.payload.data || action.payload);
      })
      .addCase(createCoa.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateCoa.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCoa.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(item => item._id === action.payload.data._id);
        if (index !== -1) {
          state.items[index] = action.payload.data;
        }
      })
      .addCase(updateCoa.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteCoa.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCoa.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items = state.items.filter(item => item._id !== action.payload);
      })
      .addCase(deleteCoa.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
  },
});

export const { clearError, clearSuccess, clearItem } = coaSlice.actions;
export default coaSlice.reducer;
