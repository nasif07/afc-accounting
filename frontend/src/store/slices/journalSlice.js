import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// --- Thunks ---

export const fetchJournalEntries = createAsyncThunk(
  "journals/fetchJournalEntries",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/accounting/journal-entries", { params });

      const payload = response?.data?.data ?? response?.data;

      // Expected paginated shape:
      // {
      //   data: [...],
      //   pagination: { total, page, limit, pages, hasNextPage, hasPrevPage }
      // }

      if (payload?.data && payload?.pagination) {
        return {
          entries: Array.isArray(payload.data) ? payload.data : [],
          pagination: payload.pagination,
        };
      }

      // Fallback for plain array responses
      if (Array.isArray(payload)) {
        return {
          entries: sortEntries(payload),
          pagination: {
            total: payload.length,
            page: 1,
            limit: payload.length || 20,
            pages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }

      return {
        entries: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch entries",
      );
    }
  },
);

export const createJournalEntry = createAsyncThunk(
  "journals/createJournalEntry",
  async (entryData, { rejectWithValue }) => {
    try {
      const response = await api.post("/accounting/journal-entries", entryData);
      return response.data.data || response.data.entry || response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create entry",
      );
    }
  },
);

export const updateJournalEntry = createAsyncThunk(
  "journals/updateJournalEntry",
  async ({ id, ...updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/accounting/journal-entries/${id}`,
        updateData,
      );
      return response.data.data || response.data.entry || response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update entry",
      );
    }
  },
);

export const deleteJournalEntry = createAsyncThunk(
  "journals/deleteJournalEntry",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/accounting/journal-entries/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete entry",
      );
    }
  },
);

// --- Helpers ---

const sortEntries = (entries) => {
  return [...entries].sort((a, b) => {
    const dateA = new Date(a.voucherDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.voucherDate || b.createdAt || 0).getTime();
    return dateB - dateA;
  });
};

// --- Slice ---

const initialState = {
  entries: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
  isLoading: false,
  error: null,
};

const journalSlice = createSlice({
  name: "journals",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearJournalState: (state) => {
      state.entries = [];
      state.pagination = initialState.pagination;
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJournalEntries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchJournalEntries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.entries = Array.isArray(action.payload?.entries)
          ? action.payload.entries
          : [];
        state.pagination = action.payload?.pagination || initialState.pagination;
      })
      .addCase(fetchJournalEntries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(createJournalEntry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createJournalEntry.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createJournalEntry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(updateJournalEntry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateJournalEntry.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(updateJournalEntry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(deleteJournalEntry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteJournalEntry.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(deleteJournalEntry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearJournalState } = journalSlice.actions;
export default journalSlice.reducer;