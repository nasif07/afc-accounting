import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';

const STUDENTS_KEY = ['students'];

// Normalizes a thrown axios error into the same { message, errors? } shape
// used by every Redux slice's rejectWithValue (accountSlice.js, etc.) so
// mutation consumers don't need to reach into err.response.data themselves.
const normalizeError = (e, fallback) => e.response?.data || { message: fallback };

// True when the backend responded with structured per-field validation
// issues (errorMiddleware.js's `errors: [{ field, message }]`) — in that
// case the form maps them to individual fields via setError, so the generic
// toast would just be redundant noise on top of the field-level messages.
const hasFieldErrors = (e) => Array.isArray(e.errors) && e.errors.length > 0;

/**
 * Fetch all students with pagination and search
 * The queryKey now includes params so it refetches on change
 */
export const useStudents = (params = {}) => {
  return useQuery({
    // CRITICAL: Include params in the key so React Query tracks page/search changes
    queryKey: [...STUDENTS_KEY, params], 
    queryFn: async () => {
      const response = await api.get('/students', { params });
      // Logic to handle different backend response structures
      return response.data.data || response.data;
    },
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true, // Smoother pagination transitions
  });
};


/**
 * Create student
 */
export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      try {
        const response = await api.post('/students', data);
        return response.data.data || response.data;
      } catch (error) {
        throw normalizeError(error, 'Failed to create student');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      toast.success('Student created successfully');
    },
    onError: (error) => {
      if (!hasFieldErrors(error)) {
        toast.error(error.message || 'Failed to create student');
      }
    },
  });
};

/**
 * Update student
 */
export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        const response = await api.patch(`/students/${id}`, data);
        return response.data.data || response.data;
      } catch (error) {
        throw normalizeError(error, 'Failed to update student');
      }
    },
    onSuccess: (data) => {
      // Invalidates the list and the specific detail view
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      queryClient.invalidateQueries({ queryKey: [...STUDENTS_KEY, 'detail', data._id] });
      toast.success('Student updated successfully');
    },
    onError: (error) => {
      if (!hasFieldErrors(error)) {
        toast.error(error.message || 'Failed to update student');
      }
    },
  });
};

/**
 * Delete student
 */
export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/students/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      queryClient.removeQueries({ queryKey: [...STUDENTS_KEY, 'detail', id] });
      toast.success('Student deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete student');
    },
  });
};

/**
 * Bulk Create Students
 */
export const useBulkCreateStudents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      // Expects data to be { students: [...] }
      const response = await api.post('/students/bulk-import', data);
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      toast.success('Bulk import successful');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Bulk import failed');
    },
  });
};