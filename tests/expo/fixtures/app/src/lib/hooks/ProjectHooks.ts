export const usePaginatedProjectList = (_options: unknown) => ({
  empty: false,
  hasMore: false,
  isError: false,
  isLoading: false,
  isLoadingMore: false,
  loadMore: () => {},
  pages: {},
  refresh: async () => {},
});
