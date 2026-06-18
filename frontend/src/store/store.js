import { configureStore } from "@reduxjs/toolkit";
import authReducer     from "./slices/authSlice";
import payrollReducer  from "./slices/payrollSlice";
import bankReducer     from "./slices/bankSlice";
import reportReducer   from "./slices/reportSlice";
import settingsReducer from "./slices/settingsSlice";
import searchReducer   from "./slices/searchSlice";
import journalReducer  from "./slices/journalSlice";
import accountReducer  from "./slices/accountSlice";
import coaReducer      from "./slices/coaSlice";
import pettyCashReducer from "./slices/pettyCashSlice";
import accountingReducer from "./slices/accountingSlice";
import studentReducer  from "./slices/studentSlice";
import receiptReducer  from "./slices/receiptSlice";

// NOTE: expenses, employees, vendors have been migrated to React Query hooks.
// Their Redux slices (expenseSlice, employeeSlice, vendorSlice) are no longer
// registered here — data is fetched and cached by @tanstack/react-query.
// Redux state is now only used for: auth, settings, and legacy slices
// that haven't yet been migrated to React Query.

const store = configureStore({
  reducer: {
    auth:       authReducer,
    payroll:    payrollReducer,
    bank:       bankReducer,
    reports:    reportReducer,
    settings:   settingsReducer,
    search:     searchReducer,
    journals:   journalReducer,
    accounts:   accountReducer,
    coa:        coaReducer,
    pettyCash:  pettyCashReducer,
    accounting: accountingReducer,
    students:   studentReducer,
    receipts:   receiptReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["auth/loginSuccess", "auth/registerSuccess"],
        ignoredPaths: ["auth.user"],
      },
    }),
});

export default store;
