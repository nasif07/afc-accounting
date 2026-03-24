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
 * Fetch receipts by status
 */
export const useReceiptsByStatus = (status, options = {}) => {
  return useQuery({
    queryKey: [...RECEIPTS_KEY, 'status', status],
    queryFn: async () => {
      const response = await api.get('/receipts', { params: { approvalStatus: status } });
      return response.data.data || response.data;
    },
    enabled: !!status,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch receipt by ID
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
export const useCreateReceiptAdvanced = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/receipts', data);
      return response.data.data || response.data;
    },
    onSuccess: () => {
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
export const useUpdateReceiptAdvanced = () => {
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
