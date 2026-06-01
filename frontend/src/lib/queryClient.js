import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      gcTime: 10 * 60 * 1000,    // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Never auto-retry mutations — POST/DELETE are not idempotent.
      // A silent retry on a failed create can produce duplicate records.
      retry: false,
    },
  },
});
