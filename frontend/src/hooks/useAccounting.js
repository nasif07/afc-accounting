import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const ACCOUNTING_KEY = ['accounting'];

/**
 * Fetch accounting summary/dashboard stats
 */
export const useAccountingSummary = (options = {}) => {
  return useQuery({
    queryKey: [...ACCOUNTING_KEY, 'summary'],
    queryFn: async () => {
      try {
        const response = await api.get('/accounting/summary');
        return response.data.data || response.data;
      } catch (error) {
        // Return default values if endpoint doesn't exist
        return {
          cashOnHand: 0,
          accountsReceivable: 0,
          accountsPayable: 0,
          totalReceipts: 0,
          totalExpenses: 0,
        };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Fetch revenue data for chart
 */
export const useRevenueData = (startDate, endDate, options = {}) => {
  return useQuery({
    queryKey: [...ACCOUNTING_KEY, 'revenue', startDate, endDate],
    queryFn: async () => {
      try {
        const response = await api.get('/accounting/revenue', {
          params: { startDate, endDate },
        });
        return response.data.data || response.data;
      } catch (error) {
        // Return empty array if endpoint doesn't exist
        return [];
      }
    },
    enabled: !!startDate && !!endDate,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch recent transactions for dashboard
 */
export const useRecentTransactions = (limit = 5, options = {}) => {
  return useQuery({
    queryKey: [...ACCOUNTING_KEY, 'recent', limit],
    queryFn: async () => {
      try {
        const response = await api.get('/accounting/recent', {
          params: { limit },
        });
        return response.data.data || response.data;
      } catch (error) {
        // Return empty array if endpoint doesn't exist
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};
