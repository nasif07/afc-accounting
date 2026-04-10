import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// --- Thunks ---

export const fetchJournalEntries = createAsyncThunk(
  "journals/fetchJournalEntries",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/accounting/journal-entries", { params });
      // Flexible handling for different API response structures
      return response.data.data || response.data.entries || response.data;
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

/**
 * Added Update Thunk
 * Expects an object with { id, ...data }
 */
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
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Entries
      .addCase(fetchJournalEntries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchJournalEntries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.entries = Array.isArray(action.payload)
          ? sortEntries(action.payload)
          : [];
      })
      .addCase(fetchJournalEntries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Create Entry
      .addCase(createJournalEntry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createJournalEntry.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?._id) {
          state.entries = sortEntries([...state.entries, action.payload]);
        }
      })
      .addCase(createJournalEntry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update Entry (New)
      .addCase(updateJournalEntry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateJournalEntry.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.entries.findIndex(
          (e) => e._id === action.payload._id,
        );
        if (index !== -1) {
          state.entries[index] = action.payload;
          state.entries = sortEntries(state.entries);
        }
      })
      .addCase(updateJournalEntry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Delete Entry
      .addCase(deleteJournalEntry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteJournalEntry.fulfilled, (state, action) => {
        state.isLoading = false;
        state.entries = state.entries.filter(
          (entry) => entry._id !== action.payload,
        );
      })
      .addCase(deleteJournalEntry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearJournalState } = journalSlice.actions;
export default journalSlice.reducer;
