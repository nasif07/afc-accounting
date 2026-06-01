import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
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
      return rejectWithValue(error.response?.data?.message || 'Failed to update settings');
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
        state.error   = action.payload;
      });
  },
});

export const { clearError, clearSuccess } = settingsSlice.actions;

// Convenience selector — returns the settings object or safe defaults
export const selectOrgInfo = (state) => ({
  orgName:              state.settings.data?.orgName    || 'Alliance Francaise de Chittagong',
  orgEmail:             state.settings.data?.orgEmail   || '',
  orgPhone:             state.settings.data?.orgPhone   || '',
  orgAddress:           state.settings.data?.orgAddress || '',
  orgWebsite:           state.settings.data?.orgWebsite || '',
  orgLogo:              state.settings.data?.orgLogo    || '/afc-logo.jpg',
  directorName:         state.settings.data?.directorName  || 'Bruno LACRAMPE',
  directorTitle:        state.settings.data?.directorTitle || 'Director',
  leaveYearLabel:       state.settings.data?.leaveYearLabel     || "July'2025 - June'2026",
  benefitPeriodLabel:   state.settings.data?.benefitPeriodLabel || '01-07-2023 to 30-06-2025',
  bankNameForPayment:   state.settings.data?.bankNameForPayment   || 'Brac Bank PLC',
  bankAccountForPayment: state.settings.data?.bankAccountForPayment || 'XXXXXXXXXXXXXXX',
  currency:       state.settings.data?.currency       || 'BDT',
  currencySymbol: state.settings.data?.currencySymbol || '৳',
});

export default settingsSlice.reducer;
