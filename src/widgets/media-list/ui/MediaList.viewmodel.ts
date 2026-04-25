import { useEffect } from "react";
import { useDownloadStore } from "@/entities/download";
import { useInfiniteScroll } from "@/shared/hooks/useInfiniteScroll";

export function useMediaListViewModel() {
  const { downloads, hasMore, isLoading, fetchNextPage } = useDownloadStore();
  const { containerRef } = useInfiniteScroll(fetchNextPage, hasMore);

  useEffect(() => {
    if (downloads.length === 0) {
      fetchNextPage();
    }
  }, [downloads.length, fetchNextPage]);

  return {
    downloads,
    isLoading,
    hasMore,
    containerRef,
  };
}
