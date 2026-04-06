import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// ================= FETCH =================

export const fetchAccounts = createAsyncThunk(
  "accounts/fetchAccounts",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("/accounts", { params });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch accounts",
      );
    }
  },
);

export const fetchAccountTree = createAsyncThunk(
  "accounts/fetchAccountTree",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { status = "all" } = params;

      const res = await api.get("/accounts/tree", {
        params: {
          includeDeleted: true, // ✅ VERY IMPORTANT
          status,               // active | inactive | archived | all
        },
      });

      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch tree"
      );
    }
  }
);

export const fetchLeafAccounts = createAsyncThunk(
  "accounts/fetchLeafAccounts",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("/accounts/leaf-nodes", { params });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch leaf accounts",
      );
    }
  },
);

// ================= CREATE =================

export const createAccount = createAsyncThunk(
  "accounts/createAccount",
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post("/accounts", data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to create account",
      );
    }
  },
);

// ================= UPDATE =================

export const updateAccount = createAsyncThunk(
  "accounts/updateAccount",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/accounts/${id}`, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update account",
      );
    }
  },
);

// ================= STATUS =================

export const updateAccountStatus = createAsyncThunk(
  "accounts/updateAccountStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/accounts/${id}/status`, { status });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update status",
      );
    }
  },
);

// ================= ARCHIVE =================

export const archiveAccount = createAsyncThunk(
  "accounts/archiveAccount",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/accounts/${id}/archive`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to archive account",
      );
    }
  },
);

// ================= RESTORE =================

export const restoreAccount = createAsyncThunk(
  "accounts/restoreAccount",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/accounts/${id}/restore`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to restore account",
      );
    }
  },
);

// ================= STATE =================

const initialState = {
  accounts: [],
  accountTree: [],
  leafAccounts: [],
  isLoading: false,
  error: null,
};

// ================= UTILS =================

const sortAccounts = (accounts) =>
  [...accounts].sort((a, b) =>
    String(a.accountCode).localeCompare(String(b.accountCode), undefined, {
      numeric: true,
    }),
  );

// ================= SLICE =================

const accountSlice = createSlice({
  name: "accounts",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder

      // FETCH
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.accounts = sortAccounts(action.payload || []);
      })

      .addCase(fetchAccountTree.fulfilled, (state, action) => {
        state.accountTree = action.payload || [];
      })

      .addCase(fetchLeafAccounts.fulfilled, (state, action) => {
        state.leafAccounts = sortAccounts(action.payload || []);
      })

      // CREATE
      .addCase(createAccount.fulfilled, (state, action) => {
        state.accounts = sortAccounts([...state.accounts, action.payload]);
      })

      // UPDATE
      .addCase(updateAccount.fulfilled, (state, action) => {
        state.accounts = sortAccounts(
          state.accounts.map((acc) =>
            acc._id === action.payload._id ? action.payload : acc,
          ),
        );
      })

      // STATUS
      .addCase(updateAccountStatus.fulfilled, (state, action) => {
        state.accounts = sortAccounts(
          state.accounts.map((acc) =>
            acc._id === action.payload._id ? action.payload : acc,
          ),
        );
      })

      // ARCHIVE (soft delete)
      .addCase(archiveAccount.fulfilled, (state, action) => {
        state.accounts = state.accounts.map((acc) =>
          acc._id === action.payload._id ? action.payload : acc,
        );
      })

      // RESTORE
      .addCase(restoreAccount.fulfilled, (state, action) => {
        state.accounts = sortAccounts(
          state.accounts.map((acc) =>
            acc._id === action.payload._id ? action.payload : acc,
          ),
        );
      });
  },
});

export const { clearError } = accountSlice.actions;
export default accountSlice.reducer;
