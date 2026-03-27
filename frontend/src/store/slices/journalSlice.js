import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchJournalEntries = createAsyncThunk(
  'journals/fetchJournalEntries',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/accounting/journal-entries', { params });
      return response.data.data || response.data.entries || response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch entries'
      );
    }
  }
);

export const createJournalEntry = createAsyncThunk(
  'journals/createJournalEntry',
  async (entryData, { rejectWithValue }) => {
    try {
      const response = await api.post('/accounting/journal-entries', entryData);
      return response.data.data || response.data.entry || response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create entry'
      );
    }
  }
);

export const deleteJournalEntry = createAsyncThunk(
  'journals/deleteJournalEntry',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/accounting/journal-entries/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete entry'
      );
    }
  }
);

const initialState = {
  entries: [],
  isLoading: false,
  error: null,
};

const sortEntries = (entries) => {
  return [...entries].sort((a, b) => {
    const dateA = new Date(a.voucherDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.voucherDate || b.createdAt || 0).getTime();
    return dateB - dateA;
  });
};

const journalSlice = createSlice({
  name: 'journals',
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
      // fetch
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

      // create
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

      // delete
      .addCase(deleteJournalEntry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteJournalEntry.fulfilled, (state, action) => {
        state.isLoading = false;
        state.entries = state.entries.filter(
          (entry) => entry._id !== action.payload
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