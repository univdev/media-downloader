import { useState, useCallback } from "react";
import { startDownloadByUrl } from "../api/startDownloadByUrl";

export function useStartDownload() {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (url: string) => {
    setIsStarting(true);
    setError(null);
    try {
      const downloadId = await startDownloadByUrl(url);
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
