import { configureStore } from "@reduxjs/toolkit";
import authReducer      from "./slices/authSlice";
import payrollReducer   from "./slices/payrollSlice";
import bankReducer      from "./slices/bankSlice";
import settingsReducer  from "./slices/settingsSlice";
import journalReducer   from "./slices/journalSlice";
import accountReducer   from "./slices/accountSlice";
import coaReducer       from "./slices/coaSlice";
import pettyCashReducer from "./slices/pettyCashSlice";
import accountingReducer from "./slices/accountingSlice";
import studentReducer   from "./slices/studentSlice";
import receiptReducer   from "./slices/receiptSlice";

const store = configureStore({
  reducer: {
    auth:       authReducer,
    payroll:    payrollReducer,
    bank:       bankReducer,
    settings:   settingsReducer,
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
