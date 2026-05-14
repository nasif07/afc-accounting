import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { pettyCashAPI } from "../../services/apiMethods";

// ==================== HELPERS ====================

const getPayloadData = (payload) => payload?.data || payload;

const getErrorMessage = (error, fallbackMessage) =>
  error.response?.data?.message || error.message || fallbackMessage;

// ==================== ASYNC THUNKS ====================

export const fetchPettyCash = createAsyncThunk(
  "pettyCash/fetchPettyCash",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await pettyCashAPI.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch petty cash records")
      );
    }
  }
);

export const fetchPettyCashById = createAsyncThunk(
  "pettyCash/fetchPettyCashById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await pettyCashAPI.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch petty cash record")
      );
    }
  }
);

export const createPettyCash = createAsyncThunk(
  "pettyCash/createPettyCash",
  async (data, { rejectWithValue }) => {
    try {
      const response = await pettyCashAPI.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to create petty cash record")
      );
    }
  }
);

export const updatePettyCash = createAsyncThunk(
  "pettyCash/updatePettyCash",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await pettyCashAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to update petty cash record")
      );
    }
  }
);

export const deletePettyCash = createAsyncThunk(
  "pettyCash/deletePettyCash",
  async (id, { rejectWithValue }) => {
    try {
      await pettyCashAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to delete petty cash record")
      );
    }
  }
);

export const fetchPettyCashStats = createAsyncThunk(
  "pettyCash/fetchPettyCashStats",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await pettyCashAPI.getStats(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch petty cash statistics")
      );
    }
  }
);

// ==================== INITIAL STATE ====================

const initialState = {
  items: [],
  item: null,
  stats: null,

  loading: false,
  error: null,
  success: false,
};

// ==================== COMMON HANDLERS ====================

const handlePending = (state) => {
  state.loading = true;
  state.error = null;
};

const handleRejected = (state, action) => {
  state.loading = false;
  state.error = action.payload;
};

// ==================== SLICE ====================

const pettyCashSlice = createSlice({
  name: "pettyCash",

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

    clearStats: (state) => {
      state.stats = null;
    },

    resetPettyCashState: () => initialState,
  },

  extraReducers: (builder) => {
    builder

      // ==================== FETCH ALL ====================

      .addCase(fetchPettyCash.pending, handlePending)

      .addCase(fetchPettyCash.fulfilled, (state, action) => {
        state.loading = false;

        const data = getPayloadData(action.payload);

        state.items = Array.isArray(data) ? data : [];
      })

      .addCase(fetchPettyCash.rejected, handleRejected)

      // ==================== FETCH BY ID ====================

      .addCase(fetchPettyCashById.pending, handlePending)

      .addCase(fetchPettyCashById.fulfilled, (state, action) => {
        state.loading = false;

        state.item = getPayloadData(action.payload);
      })

      .addCase(fetchPettyCashById.rejected, handleRejected)

      // ==================== CREATE ====================

      .addCase(createPettyCash.pending, handlePending)

      .addCase(createPettyCash.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;

        const newItem = getPayloadData(action.payload);

        if (newItem?._id) {
          const exists = state.items.some(
            (item) => item._id === newItem._id
          );

          if (!exists) {
            state.items.unshift(newItem);
          }
        }
      })

      .addCase(createPettyCash.rejected, handleRejected)

      // ==================== UPDATE ====================

      .addCase(updatePettyCash.pending, handlePending)

      .addCase(updatePettyCash.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;

        const updatedItem = getPayloadData(action.payload);

        if (updatedItem?._id) {
          const index = state.items.findIndex(
            (item) => item._id === updatedItem._id
          );

          if (index !== -1) {
            state.items[index] = updatedItem;
          }

          if (state.item?._id === updatedItem._id) {
            state.item = updatedItem;
          }
        }
      })

      .addCase(updatePettyCash.rejected, handleRejected)

      // ==================== DELETE ====================

      .addCase(deletePettyCash.pending, handlePending)

      .addCase(deletePettyCash.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;

        state.items = state.items.filter(
          (item) => item._id !== action.payload
        );

        if (state.item?._id === action.payload) {
          state.item = null;
        }
      })

      .addCase(deletePettyCash.rejected, handleRejected)

      // ==================== STATS ====================

      .addCase(fetchPettyCashStats.pending, handlePending)

      .addCase(fetchPettyCashStats.fulfilled, (state, action) => {
        state.loading = false;

        state.stats = getPayloadData(action.payload);
      })

      .addCase(fetchPettyCashStats.rejected, handleRejected);
  },
});

// ==================== ACTIONS ====================

export const {
  clearError,
  clearSuccess,
  clearItem,
  clearStats,
  resetPettyCashState,
} = pettyCashSlice.actions;

// ==================== SELECTORS ====================

export const selectPettyCashItems = (state) =>
  state.pettyCash.items;

export const selectPettyCashItem = (state) =>
  state.pettyCash.item;

export const selectPettyCashStats = (state) =>
  state.pettyCash.stats;

export const selectPettyCashLoading = (state) =>
  state.pettyCash.loading;

export const selectPettyCashError = (state) =>
  state.pettyCash.error;

export const selectPettyCashSuccess = (state) =>
  state.pettyCash.success;

// ==================== REDUCER ====================

export default pettyCashSlice.reducer;