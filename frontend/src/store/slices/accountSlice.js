import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchAccounts = createAsyncThunk(
  "accounts/fetchAccounts",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/accounts", { params });
      return response.data.data || response.data.accounts || response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch accounts",
      );
    }
  },
);

export const fetchAccountTree = createAsyncThunk(
  "accounts/fetchAccountTree",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/accounts/tree");
      return response.data.data || response.data.accounts || response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch account tree",
      );
    }
  },
);

export const fetchLeafAccounts = createAsyncThunk(
  "accounts/fetchLeafAccounts",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/accounts/leaf-nodes", { params });
      return response.data.data || response.data.accounts || response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch leaf accounts",
      );
    }
  },
);

export const createAccount = createAsyncThunk(
  "accounts/createAccount",
  async (accountData, { rejectWithValue }) => {
    try {
      const response = await api.post("/accounts", accountData);
      return response.data.data || response.data.account || response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create account",
      );
    }
  },
);

export const updateAccount = createAsyncThunk(
  "accounts/updateAccount",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/accounts/${id}`, data);
      return response.data.data || response.data.account || response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update account",
      );
    }
  },
);

export const deleteAccount = createAsyncThunk(
  "accounts/deleteAccount",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/accounts/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete account",
      );
    }
  },
);

export const restoreAccount = createAsyncThunk(
  "accounts/restoreAccount",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/accounts/${id}/restore`);
      return response.data.data || response.data.account || response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to restore account",
      );
    }
  },
);

const initialState = {
  accounts: [],
  accountTree: [],
  leafAccounts: [],
  isLoading: false,
  error: null,
};

const sortAccounts = (accounts) => {
  return [...accounts].sort((a, b) =>
    String(a.accountCode).localeCompare(String(b.accountCode), undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
};

const accountSlice = createSlice({
  name: "accounts",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAccountsState: (state) => {
      state.accounts = [];
      state.accountTree = [];
      state.leafAccounts = [];
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAccounts
      .addCase(fetchAccounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accounts = Array.isArray(action.payload)
          ? sortAccounts(action.payload)
          : [];
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // fetchAccountTree
      .addCase(fetchAccountTree.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccountTree.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accountTree = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAccountTree.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // fetchLeafAccounts
      .addCase(fetchLeafAccounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLeafAccounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.leafAccounts = Array.isArray(action.payload)
          ? sortAccounts(action.payload)
          : [];
      })
      .addCase(fetchLeafAccounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // createAccount
      .addCase(createAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.isLoading = false;

        if (action.payload?._id) {
          state.accounts = sortAccounts([...state.accounts, action.payload]);
        }
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // updateAccount
      .addCase(updateAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        state.isLoading = false;

        const index = state.accounts.findIndex(
          (acc) => acc._id === action.payload._id,
        );

        if (index !== -1) {
          state.accounts[index] = action.payload;
          state.accounts = sortAccounts(state.accounts);
        }
      })
      .addCase(updateAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // deleteAccount
      .addCase(deleteAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accounts = state.accounts.filter(
          (acc) => acc._id !== action.payload,
        );
        state.leafAccounts = state.leafAccounts.filter(
          (acc) => acc._id !== action.payload,
        );
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // restoreAccount
      .addCase(restoreAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(restoreAccount.fulfilled, (state, action) => {
        state.isLoading = false;

        if (action.payload?._id) {
          const exists = state.accounts.some(
            (acc) => acc._id === action.payload._id,
          );

          if (!exists) {
            state.accounts = sortAccounts([...state.accounts, action.payload]);
          }
        }
      })
      .addCase(restoreAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearAccountsState } = accountSlice.actions;
export default accountSlice.reducer;
