import { create } from "zustand";
import type { Download, DownloadProgress } from "./types";
import { listDownloads } from "../api/listDownloads";

interface DownloadState {
  downloads: Download[];
  activeProgress: DownloadProgress | null;
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  pageSize: number;
  fetchNextPage: () => Promise<void>;
  refresh: () => Promise<void>;
  setActiveProgress: (progress: DownloadProgress | null) => void;
  reset: () => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],
  activeProgress: null,
  page: 0,
  hasMore: true,
  isLoading: false,
  error: null,
  pageSize: 20,

  fetchNextPage: async () => {
    const { isLoading, hasMore, page, pageSize, downloads } = get();
    if (isLoading || !hasMore) return;

    set({ isLoading: true, error: null });
    try {
      const nextPage = page + 1;
      const result = await listDownloads(nextPage, pageSize);
      set({
        downloads: [...downloads, ...result.items],
        page: nextPage,
        hasMore: result.items.length >= pageSize,
        isLoading: false,
      });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  refresh: async () => {
    set({ downloads: [], page: 0, hasMore: true, error: null });
    const { pageSize } = get();
    set({ isLoading: true });
    try {
      const result = await listDownloads(1, pageSize);
      set({
        downloads: result.items,
        page: 1,
        hasMore: result.items.length >= pageSize,
        isLoading: false,
      });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  setActiveProgress: (progress) => set({ activeProgress: progress }),

  reset: () =>
    set({
      downloads: [],
      activeProgress: null,
      page: 0,
      hasMore: true,
      isLoading: false,
      error: null,
    }),
}));
