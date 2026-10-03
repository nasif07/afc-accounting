import { combineReducers, configureStore } from "@reduxjs/toolkit";
import authReducer      from "./slices/authSlice";
import payrollReducer   from "./slices/payrollSlice";
import settingsReducer  from "./slices/settingsSlice";
import journalReducer   from "./slices/journalSlice";
import accountReducer   from "./slices/accountSlice";
import coaReducer       from "./slices/coaSlice";
import pettyCashReducer from "./slices/pettyCashSlice";

const appReducer = combineReducers({
  auth:       authReducer,
  payroll:    payrollReducer,
  settings:   settingsReducer,
  journals:   journalReducer,
  accounts:   accountReducer,
  coa:        coaReducer,
  pettyCash:  pettyCashReducer,
});

// On logout, wipe every slice back to its initial state instead of only
// clearing `auth` — otherwise a fast re-login as a different user on the
// same tab can still see the previous user's cached payroll/journals/etc.
const LOGOUT_ACTION_TYPES = new Set([
  "auth/logout",
  "auth/logoutAsync/fulfilled",
  "auth/logoutAllAsync/fulfilled",
]);

const rootReducer = (state, action) => {
  if (LOGOUT_ACTION_TYPES.has(action.type)) {
    state = undefined;
  }
  return appReducer(state, action);
};

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["auth/loginSuccess", "auth/registerSuccess"],
        ignoredPaths: ["auth.user"],
      },
    }),
});

export default store;
