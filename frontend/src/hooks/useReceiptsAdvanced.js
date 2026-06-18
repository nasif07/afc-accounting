import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';

const RECEIPTS_KEY = ['receipts'];

/**
 * Fetch all receipts with filters
 */
export const useReceiptsAdvanced = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: [...RECEIPTS_KEY, filters],
    queryFn: async () => {
      const response = await api.get('/receipts', { params: filters });
      return response.data.data || response.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Delete receipt
 */
export const useDeleteReceiptAdvanced = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/receipts/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: RECEIPTS_KEY });
      queryClient.removeQueries({ queryKey: [...RECEIPTS_KEY, id] });
      toast.success('Receipt deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete receipt');
    },
  });
};

/**
 * Approve receipt
 */
export const useApproveReceiptAdvanced = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/receipts/${id}/approve`);
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECEIPTS_KEY });
      toast.success('Receipt approved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to approve receipt');
    },
  });
};

/**
 * Reject receipt
 */
export const useRejectReceiptAdvanced = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const response = await api.post(`/receipts/${id}/reject`, { rejectionReason: reason });
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECEIPTS_KEY });
      toast.success('Receipt rejected');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reject receipt');
    },
  });
};
