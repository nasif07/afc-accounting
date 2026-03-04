import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import accountReducer from './slices/accountSlice';
import journalReducer from './slices/journalSlice';
import studentReducer from './slices/studentSlice';
import expenseReducer from './slices/expenseSlice';
import payrollReducer from './slices/payrollSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    accounts: accountReducer,
    journals: journalReducer,
    students: studentReducer,
    expenses: expenseReducer,
    payroll: payrollReducer,
  },
});

export default store;
