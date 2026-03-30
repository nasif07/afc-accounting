import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { accountingAPI } from "../../services/apiMethods";

// helper
const extract = (res) => res?.data?.data || res?.data || res;

// ================= THUNKS =================

export const fetchAccounting = createAsyncThunk(
  "accounting/fetchAccounting",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await accountingAPI.getAll(params);
      return extract(res);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch accounting"
      );
    }
  }
);

export const fetchAccountingById = createAsyncThunk(
  "accounting/fetchAccountingById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await accountingAPI.getById(id);
      return extract(res);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch accounting"
      );
    }
  }
);

export const createAccounting = createAsyncThunk(
  "accounting/createAccounting",
  async (data, { rejectWithValue }) => {
    try {
      const res = await accountingAPI.create(data);
      return extract(res);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create accounting"
      );
    }
  }
);

export const updateAccounting = createAsyncThunk(
  "accounting/updateAccounting",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await accountingAPI.update(id, data);
      return extract(res);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update accounting"
      );
    }
  }
);

export const deleteAccounting = createAsyncThunk(
  "accounting/deleteAccounting",
  async (id, { rejectWithValue }) => {
    try {
      await accountingAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete accounting"
      );
    }
  }
);

export const approveAccounting = createAsyncThunk(
  "accounting/approveAccounting",
  async (id, { rejectWithValue }) => {
    try {
      const res = await accountingAPI.approve(id);
      return extract(res);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to approve accounting"
      );
    }
  }
);

export const rejectAccounting = createAsyncThunk(
  "accounting/rejectAccounting",
  async ({ id, rejectionReason }, { rejectWithValue }) => {
    try {
      const res = await accountingAPI.reject(id, { rejectionReason });
      return extract(res);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to reject accounting"
      );
    }
  }
);

// ================= STATE =================

const initialState = {
  items: [],
  item: null,
  loading: false,
  error: null,
  success: false,
};

// sort helper
const sortByDate = (items) =>
  [...items].sort((a, b) => {
    const d1 = new Date(a.voucherDate || a.createdAt || 0).getTime();
    const d2 = new Date(b.voucherDate || b.createdAt || 0).getTime();
    return d2 - d1;
  });

// ================= SLICE =================

const accountingSlice = createSlice({
  name: "accounting",
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
    resetAccounting: () => initialState,
  },
  extraReducers: (builder) => {
    builder

      // FETCH ALL
      .addCase(fetchAccounting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccounting.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload)
          ? sortByDate(action.payload)
          : [];
      })
      .addCase(fetchAccounting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // FETCH ONE
      .addCase(fetchAccountingById.fulfilled, (state, action) => {
        state.item = action.payload;
      })

      // CREATE
      .addCase(createAccounting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAccounting.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;

        if (action.payload?._id) {
          state.items = sortByDate([...state.items, action.payload]);
        }
      })
      .addCase(createAccounting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // UPDATE
      .addCase(updateAccounting.fulfilled, (state, action) => {
        state.success = true;

        const index = state.items.findIndex(
          (item) => item._id === action.payload._id
        );

        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })

      // DELETE
      .addCase(deleteAccounting.fulfilled, (state, action) => {
        state.success = true;
        state.items = state.items.filter(
          (item) => item._id !== action.payload
        );
      })

      // APPROVE
      .addCase(approveAccounting.fulfilled, (state, action) => {
        state.success = true;

        const index = state.items.findIndex(
          (item) => item._id === action.payload._id
        );

        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })

      // REJECT
      .addCase(rejectAccounting.fulfilled, (state, action) => {
        state.success = true;

        const index = state.items.findIndex(
          (item) => item._id === action.payload._id
        );

        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });
  },
});

export const {
  clearError,
  clearSuccess,
  clearItem,
  resetAccounting,
} = accountingSlice.actions;

export default accountingSlice.reducer;