import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';

const RECEIPTS_KEY = ['receipts'];

/**
 * Fetch all receipts
 */
export const useReceipts = (options = {}) => {
  return useQuery({
    queryKey: RECEIPTS_KEY,
    queryFn: async () => {
      const response = await api.get('/receipts');
      return response.data.data || response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Fetch single receipt by ID
 */
export const useReceiptById = (id, options = {}) => {
  return useQuery({
    queryKey: [...RECEIPTS_KEY, id],
    queryFn: async () => {
      const response = await api.get(`/receipts/${id}`);
      return response.data.data || response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Create receipt
 */
export const useCreateReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/receipts', data);
      return response.data.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: RECEIPTS_KEY });
      toast.success('Receipt created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create receipt');
    },
  });
};

/**
 * Update receipt
 */
export const useUpdateReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/receipts/${id}`, data);
      return response.data.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: RECEIPTS_KEY });
      queryClient.invalidateQueries({ queryKey: [...RECEIPTS_KEY, data._id] });
      toast.success('Receipt updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update receipt');
    },
  });
};

/**
 * Delete receipt
 */
export const useDeleteReceipt = () => {
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
export const useApproveReceipt = () => {
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
export const useRejectReceipt = () => {
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
