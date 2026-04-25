import { useState, useCallback } from "react";
import { startDownload } from "../api/startDownload";

export function useStartDownload() {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (sequenceJson: string) => {
    setIsStarting(true);
    setError(null);
    try {
      const downloadId = await startDownload(sequenceJson);
      return downloadId;
    } catch (e) {
      setError(String(e));
      return null;
    } finally {
      setIsStarting(false);
    }
  }, []);

  return { start, isStarting, error };
}
