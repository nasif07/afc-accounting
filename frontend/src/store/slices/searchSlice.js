import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { searchAPI } from '../../services/apiMethods';

export const fetchSearch = createAsyncThunk(
  'search/fetchSearch',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await searchAPI.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch search');
    }
  }
);

export const fetchSearchById = createAsyncThunk(
  'search/fetchSearchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await searchAPI.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch search');
    }
  }
);

export const createSearch = createAsyncThunk(
  'search/createSearch',
  async (data, { rejectWithValue }) => {
    try {
      const response = await searchAPI.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create search');
    }
  }
);

export const updateSearch = createAsyncThunk(
  'search/updateSearch',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await searchAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update search');
    }
  }
);

export const deleteSearch = createAsyncThunk(
  'search/deleteSearch',
  async (id, { rejectWithValue }) => {
    try {
      await searchAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete search');
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

const searchSlice = createSlice({
  name: 'search',
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
      .addCase(fetchSearch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSearch.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || action.payload;
      })
      .addCase(fetchSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSearchById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSearchById.fulfilled, (state, action) => {
        state.loading = false;
        state.item = action.payload.data || action.payload;
      })
      .addCase(fetchSearchById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSearch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSearch.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items.push(action.payload.data || action.payload);
      })
      .addCase(createSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateSearch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSearch.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(item => item._id === action.payload.data._id);
        if (index !== -1) {
          state.items[index] = action.payload.data;
        }
      })
      .addCase(updateSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteSearch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSearch.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items = state.items.filter(item => item._id !== action.payload);
      })
      .addCase(deleteSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
  },
});

export const { clearError, clearSuccess, clearItem } = searchSlice.actions;
export default searchSlice.reducer;
