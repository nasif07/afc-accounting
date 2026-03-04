import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const fetchJournalEntries = createAsyncThunk(
  'journals/fetchJournalEntries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/journal-entries`, getAuthHeader());
      return response.data.entries;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch entries');
    }
  }
);

export const createJournalEntry = createAsyncThunk(
  'journals/createJournalEntry',
  async (entryData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/journal-entries`, entryData, getAuthHeader());
      return response.data.entry;
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
        state.entries = action.payload;
      })
      .addCase(fetchJournalEntries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createJournalEntry.fulfilled, (state, action) => {
        state.entries.push(action.payload);
      });
  },
});

export const { clearError } = journalSlice.actions;
export default journalSlice.reducer;
