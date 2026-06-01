import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';

const KEY = ['vendors'];

export const useVendors = (params = {}, options = {}) =>
  useQuery({
    queryKey: [...KEY, params],
    queryFn: async () => {
      const res = await api.get('/vendors', { params });
      return res.data?.data || res.data || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });

export const useCreateVendor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/vendors', data);
      return res.data?.data || res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Vendor created'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to create vendor'),
  });
};

export const useUpdateVendor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/vendors/${id}`, data);
      return res.data?.data || res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Vendor updated'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to update vendor'),
  });
};

export const useDeleteVendor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => { await api.delete(`/vendors/${id}`); return id; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Vendor deleted'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to delete vendor'),
  });
};
