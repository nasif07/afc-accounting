import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { pettyCashAPI } from '../services/apiMethods';

const KEY = ['petty-cash-history'];
const PETTY_CASH_ACCOUNT_CODE = '1001';

const EMPTY_SUMMARY = { totalDebit: 0, totalCredit: 0, balance: 0, count: 0 };
const EMPTY_PAGINATION = (limit) => ({ total: 0, page: 1, limit, totalPages: 1 });

// Filters (page/search/date range) live in the query key so a rapid filter
// change auto-cancels the now-stale in-flight request instead of letting it
// resolve later and overwrite fresher data on screen.
export const usePettyCashHistory = ({ page, limit, search, dateFrom, dateTo }, options = {}) =>
  useQuery({
    queryKey: [...KEY, page, limit, search, dateFrom, dateTo],
    queryFn: async ({ signal }) => {
      const response = await pettyCashAPI.getTransactions(
        {
          page,
          limit,
          search: search || undefined,
          startDate: dateFrom || undefined,
          endDate: dateTo || undefined,
        },
        { signal },
      );
      const payload = response?.data?.data || {};

      // Defensive: ensure the backend returned the expected petty cash account.
      const account = payload.account || null;
      if (account && String(account.accountCode) !== PETTY_CASH_ACCOUNT_CODE) {
        throw new Error(`Petty cash account code ${PETTY_CASH_ACCOUNT_CODE} not found`);
      }

      return {
        account,
        transactions: Array.isArray(payload.transactions) ? payload.transactions : [],
        summary: {
          totalDebit: Number(payload.summary?.totalDebit || 0),
          totalCredit: Number(payload.summary?.totalCredit || 0),
          balance: Number(payload.summary?.balance || 0),
          count: Number(payload.summary?.count || 0),
        },
        pagination: {
          total: Number(payload.pagination?.total || 0),
          page: Number(payload.pagination?.page || 1),
          limit: Number(payload.pagination?.limit || limit),
          totalPages: Number(payload.pagination?.totalPages || 1),
        },
      };
    },
    placeholderData: keepPreviousData,
    ...options,
  });

export const PETTY_CASH_HISTORY_KEY = KEY;
export const EMPTY_PETTY_CASH_SUMMARY = EMPTY_SUMMARY;
export const emptyPettyCashPagination = EMPTY_PAGINATION;
