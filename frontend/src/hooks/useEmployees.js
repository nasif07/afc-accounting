import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';

const KEY = ['employees'];

export const useEmployees = (params = {}, options = {}) =>
  useQuery({
    queryKey: [...KEY, params],
    queryFn: async () => {
      const res = await api.get('/employees', { params });
      return res.data?.data || res.data || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });

export const useCreateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/employees', data);
      return res.data?.data || res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Employee created'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to create employee'),
  });
};

export const useUpdateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/employees/${id}`, data);
      return res.data?.data || res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Employee updated'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to update employee'),
  });
};

export const useDeleteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => { await api.delete(`/employees/${id}`); return id; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Employee deleted'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to delete employee'),
  });
};
