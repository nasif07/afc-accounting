import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { settingsAPI } from '../../services/apiMethods';

export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await settingsAPI.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
    }
  }
);

export const fetchSettingById = createAsyncThunk(
  'settings/fetchSettingById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await settingsAPI.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch setting');
    }
  }
);

export const createSetting = createAsyncThunk(
  'settings/createSetting',
  async (data, { rejectWithValue }) => {
    try {
      const response = await settingsAPI.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create setting');
    }
  }
);

export const updateSetting = createAsyncThunk(
  'settings/updateSetting',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await settingsAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update setting');
    }
  }
);

export const deleteSetting = createAsyncThunk(
  'settings/deleteSetting',
  async (id, { rejectWithValue }) => {
    try {
      await settingsAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete setting');
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

const settingsSlice = createSlice({
  name: 'settings',
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
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSettingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettingById.fulfilled, (state, action) => {
        state.loading = false;
        state.item = action.payload.data || action.payload;
      })
      .addCase(fetchSettingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSetting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSetting.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items.push(action.payload.data || action.payload);
      })
      .addCase(createSetting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateSetting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSetting.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(item => item._id === action.payload.data._id);
        if (index !== -1) {
          state.items[index] = action.payload.data;
        }
      })
      .addCase(updateSetting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteSetting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSetting.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items = state.items.filter(item => item._id !== action.payload);
      })
      .addCase(deleteSetting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
  },
});

export const { clearError, clearSuccess, clearItem } = settingsSlice.actions;
export default settingsSlice.reducer;
