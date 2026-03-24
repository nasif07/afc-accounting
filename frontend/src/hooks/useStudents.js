import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';

const STUDENTS_KEY = ['students'];

/**
 * Fetch all students
 */
export const useStudents = (options = {}) => {
  return useQuery({
    queryKey: STUDENTS_KEY,
    queryFn: async () => {
      const response = await api.get('/students');
      return response.data.data || response.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch student by ID
 */
export const useStudentById = (id, options = {}) => {
  return useQuery({
    queryKey: [...STUDENTS_KEY, id],
    queryFn: async () => {
      const response = await api.get(`/students/${id}`);
      return response.data.data || response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Create student
 */
export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/students', data);
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      toast.success('Student created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create student');
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
      const response = await api.put(`/students/${id}`, data);
      return response.data.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      queryClient.invalidateQueries({ queryKey: [...STUDENTS_KEY, data._id] });
      toast.success('Student updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update student');
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
      queryClient.removeQueries({ queryKey: [...STUDENTS_KEY, id] });
      toast.success('Student deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete student');
    },
  });
};
