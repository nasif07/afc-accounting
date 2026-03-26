import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchJournalEntries = createAsyncThunk(
  'journals/fetchJournalEntries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/accounting/journal-entries');
      return response.data.data || response.data.entries || response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch entries');
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
      return rejectWithValue(error.response?.data?.message || 'Failed to create entry');
    }
  }
);

const initialState = {
  entries: [],
  isLoading: false,
  error: null,
};

const journalSlice = createSlice({
  name: 'journals',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJournalEntries.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchJournalEntries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.entries = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchJournalEntries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createJournalEntry.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createJournalEntry.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.entries.push(action.payload);
        }
      })
      .addCase(createJournalEntry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = journalSlice.actions;
export default journalSlice.reducer;
