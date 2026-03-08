import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const MODULE = 'PLACEHOLDER';

const initialState = {
  items: [],
  item: null,
  loading: false,
  error: null,
  success: false,
};

const slice = createSlice({
  name: MODULE.toLowerCase(),
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
  },
  extraReducers: (builder) => {},
});

export const { clearError, clearSuccess } = slice.actions;
export default slice.reducer;
