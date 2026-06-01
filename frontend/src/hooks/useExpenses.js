import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';

const KEY = ['expenses'];

export const useExpenses = (params = {}, options = {}) =>
  useQuery({
    queryKey: [...KEY, params],
    queryFn: async () => {
      const res = await api.get('/expenses', { params });
      return res.data?.data || res.data || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });

export const useCreateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/expenses', data);
      return res.data?.data || res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Expense created'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to create expense'),
  });
};

export const useUpdateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/expenses/${id}`, data);
      return res.data?.data || res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Expense updated'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to update expense'),
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => { await api.delete(`/expenses/${id}`); return id; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Expense deleted'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to delete expense'),
  });
};

export const useApproveExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/expenses/${id}/approve`);
      return res.data?.data || res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Expense approved'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to approve expense'),
  });
};
