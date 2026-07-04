import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { settingsAPI } from '../../services/apiMethods';

export const fetchSettings = createAsyncThunk(
  'settings/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await settingsAPI.get();
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
    }
  },
);

export const updateSettings = createAsyncThunk(
  'settings/update',
  async (data, { rejectWithValue }) => {
    try {
      const response = await settingsAPI.update(data);
      return response.data?.data ?? response.data;
    } catch (error) {
      // Preserve the full backend error payload (not just the message
      // string), same pattern as accountSlice.js/payrollSlice.js. Currently
      // a no-op in practice — there's no Zod validation middleware on the
      // /settings route, so `errors[]` is never populated for this endpoint
      // today — but this keeps the slice consistent and correct if that
      // ever changes.
      return rejectWithValue(
        error.response?.data || { message: 'Failed to update settings' },
      );
    }
  },
);

const initialState = {
  data: null,
  loading: false,
  error: null,
  success: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearError:   (state) => { state.error   = null;  },
    clearSuccess: (state) => { state.success = false; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending,  (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })
      .addCase(updateSettings.pending,  (state) => { state.loading = true;  state.error = null; })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.data    = action.payload;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.loading = false;
        const hasFieldErrors = Array.isArray(action.payload?.errors) && action.payload.errors.length > 0;
        state.error = hasFieldErrors ? null : action.payload?.message || 'Failed to update settings';
      });
  },
});

export const { clearError, clearSuccess } = settingsSlice.actions;

// Memoized selector — only recomputes when settings.data reference changes,
// preventing unnecessary rerenders in every consumer on unrelated state updates.
const selectSettingsData = (state) => state.settings.data;

export const selectOrgInfo = createSelector(selectSettingsData, (data) => ({
  orgName:               data?.orgName    || 'Alliance Francaise de Chittagong',
  orgEmail:              data?.orgEmail   || '',
  orgPhone:              data?.orgPhone   || '',
  orgAddress:            data?.orgAddress || '',
  orgWebsite:            data?.orgWebsite || '',
  orgLogo:               data?.orgLogo    || '/afc-logo.jpg',
  directorName:          data?.directorName  || 'Bruno LACRAMPE',
  directorTitle:         data?.directorTitle || 'Director',
  leaveYearLabel:        data?.leaveYearLabel     || "July'2025 - June'2026",
  benefitPeriodLabel:    data?.benefitPeriodLabel || '01-07-2023 to 30-06-2025',
  bankNameForPayment:    data?.bankNameForPayment   || 'Brac Bank PLC',
  bankAccountForPayment: data?.bankAccountForPayment || 'XXXXXXXXXXXXXXX',
  currency:              data?.currency       || 'BDT',
  currencySymbol:        data?.currencySymbol || '৳',
}));

export default settingsSlice.reducer;
