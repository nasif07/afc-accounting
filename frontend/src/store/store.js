import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import studentReducer from './slices/studentSlice';
import receiptReducer from './slices/receiptSlice';
import expenseReducer from './slices/expenseSlice';
import vendorReducer from './slices/vendorSlice';
import employeeReducer from './slices/employeeSlice';
import payrollReducer from './slices/payrollSlice';
import accountingReducer from './slices/accountingSlice';
import coaReducer from './slices/coaSlice';
import bankReducer from './slices/bankSlice';
import reportReducer from './slices/reportSlice';
import settingsReducer from './slices/settingsSlice';
import searchReducer from './slices/searchSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    students: studentReducer,
    receipts: receiptReducer,
    expenses: expenseReducer,
    vendors: vendorReducer,
    employees: employeeReducer,
    payroll: payrollReducer,
    accounting: accountingReducer,
    coa: coaReducer,
    bank: bankReducer,
    reports: reportReducer,
    settings: settingsReducer,
    search: searchReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/loginSuccess', 'auth/registerSuccess'],
        ignoredPaths: ['auth.user'],
      },
    }),
});

export default store;
