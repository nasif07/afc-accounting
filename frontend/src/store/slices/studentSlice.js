import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { studentAPI } from "../../services/apiMethods";

// --- Async Thunks ---
export const fetchStudents = createAsyncThunk(
  "students/fetchStudents",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await studentAPI.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch students");
    }
  }
);

export const fetchStudentById = createAsyncThunk(
  "students/fetchStudentById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await studentAPI.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch student");
    }
  }
);

export const createStudent = createAsyncThunk(
  "students/createStudent",
  async (data, { rejectWithValue }) => {
    try {
      const response = await studentAPI.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to create student");
    }
  }
);

export const updateStudent = createAsyncThunk(
  "students/updateStudent",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await studentAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to update student");
    }
  }
);

export const updateFeeStatus = createAsyncThunk(
  "students/updateFeeStatus",
  async ({ id, paidAmount }, { rejectWithValue }) => {
    try {
      const response = await studentAPI.updateFee(id, { paidAmount });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to update fees");
    }
  }
);

export const deleteStudent = createAsyncThunk(
  "students/deleteStudent",
  async (id, { rejectWithValue }) => {
    try {
      await studentAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete student");
    }
  }
);

// --- Slice Definition ---
const initialState = {
  items: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  },
  item: null,
  loading: false,
  error: null,
  success: false,
};

const studentSlice = createSlice({
  name: "students",
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    clearSuccess: (state) => { state.success = false; },
    clearItem: (state) => { state.item = null; },
  },
  extraReducers: (builder) => {
    builder
      // --- 1. ALL addCase CALLS MUST BE FIRST ---
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data.students;
        state.pagination = action.payload.data.pagination;
      })
      .addCase(fetchStudentById.fulfilled, (state, action) => {
        state.loading = false;
        state.item = action.payload.data;
      })
      .addCase(createStudent.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items.unshift(action.payload.data);
      })
      .addCase(deleteStudent.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.items = state.items.filter((item) => item._id !== action.payload);
      })

      // --- 2. ALL addMatcher CALLS MUST BE SECOND ---
      
      // Update Logic (General & Fees)
      .addMatcher(
        (action) => [updateStudent.fulfilled.type, updateFeeStatus.fulfilled.type].includes(action.type),
        (state, action) => {
          state.loading = false;
          state.success = true;
          const updatedStudent = action.payload.data;
          const index = state.items.findIndex((s) => s._id === updatedStudent._id);
          if (index !== -1) state.items[index] = updatedStudent;
          if (state.item?._id === updatedStudent._id) state.item = updatedStudent;
        }
      )
      // Global Loading (Pending)
      .addMatcher(
        (action) => action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      // Global Error (Rejected)
      .addMatcher(
        (action) => action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      );
  },
});

export const { clearError, clearSuccess, clearItem } = studentSlice.actions;
export default studentSlice.reducer;