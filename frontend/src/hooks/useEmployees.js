import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';

const KEY = ['employees'];

// Normalizes a thrown axios error into the same { message, errors? } shape
// used by every Redux slice's rejectWithValue (accountSlice.js, etc.) so
// mutation consumers don't need to reach into err.response.data themselves.
const normalizeError = (e, fallback) => e.response?.data || { message: fallback };

// True when the backend responded with structured per-field validation
// issues (errorMiddleware.js's `errors: [{ field, message }]`) — in that
// case the form maps them to individual fields via setError, so the generic
// toast would just be redundant noise on top of the field-level messages.
const hasFieldErrors = (e) => Array.isArray(e.errors) && e.errors.length > 0;

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
      try {
        const res = await api.post('/employees', data);
        return res.data?.data || res.data;
      } catch (e) {
        throw normalizeError(e, 'Failed to create employee');
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Employee created'); },
    onError:   (e) => { if (!hasFieldErrors(e)) toast.error(e.message || 'Failed to create employee'); },
  });
};

export const useUpdateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        const res = await api.put(`/employees/${id}`, data);
        return res.data?.data || res.data;
      } catch (e) {
        throw normalizeError(e, 'Failed to update employee');
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Employee updated'); },
    onError:   (e) => { if (!hasFieldErrors(e)) toast.error(e.message || 'Failed to update employee'); },
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
