import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { settingsAPI } from '../../services/apiMethods';
import { API_URL } from '../../services/api';

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

/**
 * The URL an <img> should load for the organisation logo.
 *
 * Three sources, in priority order, because installs exist in all three states:
 *   1. an uploaded object — served through the API, which redirects to a
 *      short-lived presigned GET (the bucket is private, so the key itself is
 *      never a URL);
 *   2. a legacy hand-typed path or URL from the old text field;
 *   3. the artwork bundled with the frontend.
 *
 * The `v` parameter is what makes a replaced logo actually appear: the URL is
 * otherwise identical across uploads, so the browser would keep serving the
 * previous image from cache.
 */
const resolveLogoUrl = (data) => {
  if (data?.orgLogoKey) {
    const version = data.orgLogoUpdatedAt
      ? new Date(data.orgLogoUpdatedAt).getTime()
      : '';
    return `${API_URL}/settings/logo${version ? `?v=${version}` : ''}`;
  }
  return data?.orgLogo || '/afc-full-logo.jpg';
};

export const selectOrgInfo = createSelector(selectSettingsData, (data) => ({
  orgName:               data?.orgName    || 'Alliance Francaise de Chittagong',
  orgEmail:              data?.orgEmail   || '',
  orgPhone:              data?.orgPhone   || '',
  orgAddress:            data?.orgAddress || '',
  orgWebsite:            data?.orgWebsite || '',
  orgLogo:               resolveLogoUrl(data),
  // The raw key, for the Settings screen: it needs to know whether a logo was
  // uploaded (and so whether "Remove" applies) rather than just what to render.
  orgLogoKey:            data?.orgLogoKey || '',
  directorName:          data?.directorName  || 'Bruno LACRAMPE',
  directorTitle:         data?.directorTitle || 'Director',
  leaveYearLabel:        data?.leaveYearLabel     || "July'2025 - June'2026",
  benefitPeriodLabel:    data?.benefitPeriodLabel || '01-07-2023 to 30-06-2025',
  healthFundLabel:       data?.healthFundLabel    || 'Health Fund',
  annualLeaveDays:       data?.annualLeaveDays ?? 0,
  sickLeaveDays:         data?.sickLeaveDays   ?? 0,
  bankNameForPayment:    data?.bankNameForPayment   || 'Brac Bank PLC',
  bankAccountForPayment: data?.bankAccountForPayment || 'XXXXXXXXXXXXXXX',
  currency:              data?.currency       || 'BDT',
  currencySymbol:        data?.currencySymbol || '৳',
}));

export default settingsSlice.reducer;
