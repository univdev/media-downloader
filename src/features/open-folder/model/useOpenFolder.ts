import { useCallback } from "react";
import { openFolder } from "../api/openFolder";

export function useOpenFolder() {
  const open = useCallback(async (path: string) => {
    try {
      await openFolder(path);
    } catch (e) {
      console.error("Failed to open folder:", e);
    }
  }, []);

  return { open };
}
