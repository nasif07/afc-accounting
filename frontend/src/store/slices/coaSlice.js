import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { coaAPI } from "../../services/apiMethods";

const getPayloadData = (payload) => payload?.data || payload;

const getErrorMessage = (error, fallbackMessage) =>
  error.response?.data?.message || error.message || fallbackMessage;

// ==================== ASYNC THUNKS ====================

export const fetchCoa = createAsyncThunk(
  "coa/fetchCoa",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await coaAPI.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch COA"));
    }
  },
);

export const fetchCoaById = createAsyncThunk(
  "coa/fetchCoaById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await coaAPI.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch COA"));
    }
  },
);

export const createCoa = createAsyncThunk(
  "coa/createCoa",
  async (data, { rejectWithValue }) => {
    try {
      const response = await coaAPI.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to create COA"));
    }
  },
);

export const updateCoa = createAsyncThunk(
  "coa/updateCoa",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await coaAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to update COA"));
    }
  },
);

export const deleteCoa = createAsyncThunk(
  "coa/deleteCoa",
  async (id, { rejectWithValue }) => {
    try {
      await coaAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to delete COA"));
    }
  },
);

export const getCoaBalance = createAsyncThunk(
  "coa/getCoaBalance",
  async (id, { rejectWithValue }) => {
    try {
      const response = await coaAPI.getBalance(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch balance"));
    }
  },
);

// ==================== INITIAL STATE ====================

const initialState = {
  items: [],
  item: null,
  balance: null,

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

const coaSlice = createSlice({
  name: "coa",
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

    clearBalance: (state) => {
      state.balance = null;
    },

    resetCoaState: () => initialState,
  },

  extraReducers: (builder) => {
    builder
      // Fetch all COA
      .addCase(fetchCoa.pending, handlePending)
      .addCase(fetchCoa.fulfilled, (state, action) => {
        state.loading = false;

        const data = getPayloadData(action.payload);
        state.items = Array.isArray(data) ? data : [];
      })
      .addCase(fetchCoa.rejected, handleRejected)

      // Fetch COA by ID
      .addCase(fetchCoaById.pending, handlePending)
      .addCase(fetchCoaById.fulfilled, (state, action) => {
        state.loading = false;
        state.item = getPayloadData(action.payload);
      })
      .addCase(fetchCoaById.rejected, handleRejected)

      // Create COA
      .addCase(createCoa.pending, handlePending)
      .addCase(createCoa.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;

        const newItem = getPayloadData(action.payload);

        if (newItem?._id) {
          const exists = state.items.some((item) => item._id === newItem._id);

          if (!exists) {
            state.items.unshift(newItem);
          }
        }
      })
      .addCase(createCoa.rejected, handleRejected)

      // Update COA
      .addCase(updateCoa.pending, handlePending)
      .addCase(updateCoa.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;

        const updatedItem = getPayloadData(action.payload);

        if (updatedItem?._id) {
          const index = state.items.findIndex(
            (item) => item._id === updatedItem._id,
          );

          if (index !== -1) {
            state.items[index] = updatedItem;
          }

          if (state.item?._id === updatedItem._id) {
            state.item = updatedItem;
          }
        }
      })
      .addCase(updateCoa.rejected, handleRejected)

      // Delete COA
      .addCase(deleteCoa.pending, handlePending)
      .addCase(deleteCoa.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;

        state.items = state.items.filter((item) => item._id !== action.payload);

        if (state.item?._id === action.payload) {
          state.item = null;
        }
      })
      .addCase(deleteCoa.rejected, handleRejected)

      // Get COA balance
      .addCase(getCoaBalance.pending, handlePending)
      .addCase(getCoaBalance.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = getPayloadData(action.payload);
      })
      .addCase(getCoaBalance.rejected, handleRejected);
  },
});

// ==================== ACTIONS ====================

export const {
  clearError,
  clearSuccess,
  clearItem,
  clearBalance,
  resetCoaState,
} = coaSlice.actions;

export default coaSlice.reducer;
