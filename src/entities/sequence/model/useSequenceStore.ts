import { create } from "zustand";
import type { SequenceMeta } from "./types";
import { listSequences } from "../api/listSequences";

interface SequenceState {
  sequences: SequenceMeta[];
  selectedName: string | null;
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  select: (name: string | null) => void;
  reset: () => void;
}

export const useSequenceStore = create<SequenceState>((set) => ({
  sequences: [],
  selectedName: null,
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const sequences = await listSequences();
      set({ sequences, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  select: (name) => set({ selectedName: name }),

  reset: () =>
    set({
      sequences: [],
      selectedName: null,
      isLoading: false,
      error: null,
    }),
}));
