import { QueryClient } from "@tanstack/react-query";

// Cached data displays instantly from memory while triggering quiet background
// revalidation on tab/route navigation. Unused cache is collected after 5 minutes.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
