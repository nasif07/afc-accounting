import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';

const JOURNAL_KEY = ['journal'];

/**
 * Fetch all journal entries
 */
export const useJournalEntries = (options = {}) => {
  return useQuery({
    queryKey: JOURNAL_KEY,
    queryFn: async () => {
      const response = await api.get('/accounting');
      return response.data.data || response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Fetch single journal entry by ID
 */
export const useJournalEntryById = (id, options = {}) => {
  return useQuery({
    queryKey: [...JOURNAL_KEY, id],
    queryFn: async () => {
      const response = await api.get(`/accounting/${id}`);
      return response.data.data || response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Create journal entry
 */
export const useCreateJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/accounting', data);
      return response.data.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_KEY });
      toast.success('Journal entry created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create journal entry');
    },
  });
};

/**
 * Update journal entry
 */
export const useUpdateJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/accounting/${id}`, data);
      return response.data.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_KEY });
      queryClient.invalidateQueries({ queryKey: [...JOURNAL_KEY, data._id] });
      toast.success('Journal entry updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update journal entry');
    },
  });
};

/**
 * Delete journal entry
 */
export const useDeleteJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/accounting/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_KEY });
      queryClient.removeQueries({ queryKey: [...JOURNAL_KEY, id] });
      toast.success('Journal entry deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete journal entry');
    },
  });
};

/**
 * Approve journal entry
 */
export const useApproveJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/accounting/${id}/approve`);
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_KEY });
      toast.success('Journal entry approved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to approve journal entry');
    },
  });
};

/**
 * Reject journal entry
 */
export const useRejectJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const response = await api.post(`/accounting/${id}/reject`, { rejectionReason: reason });
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_KEY });
      toast.success('Journal entry rejected');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reject journal entry');
    },
  });
};

/**
 * Fetch chart of accounts for journal entry form
 */
export const useChartOfAccounts = (options = {}) => {
  return useQuery({
    queryKey: ['chartOfAccounts'],
    queryFn: async () => {
      const response = await api.get('/chart-of-accounts');
      return response.data.data || response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (rarely changes)
    ...options,
  });
};
