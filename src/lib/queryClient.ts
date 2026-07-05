import { QueryClient } from '@tanstack/react-query';

/* Server data cache. Defaults chosen to echo the vanilla app's behaviour:
 * the catalog endpoints already carry `max-age=600, stale-while-revalidate`,
 * so we keep data fresh for 10 min and avoid refetch-on-focus thrash. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 min — matches the API Cache-Control
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
